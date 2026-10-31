#![forbid(unsafe_code)]

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Emitter, Manager, WindowEvent};
use thiserror::Error;
use zeroize::{Zeroize, ZeroizeOnDrop, Zeroizing};
use sha2::{Digest, Sha256};

// -----------------------------------------------------------------------------
// 1. Types d'Erreurs Métier Robustes (Zero-Panic Policy)
// -----------------------------------------------------------------------------
#[derive(Debug, Error, Serialize)]
pub enum ProctorError {
    #[error("Erreur de communication avec le serveur Moodle")]
    MoodleApiError,

    #[error("Impossible de communiquer avec le réseau")]
    NetworkError,

    #[error("Erreur de gestion de fenêtre")]
    WindowError,

    #[error("Multi-écrans détecté : l'examen exige un écran unique")]
    MultipleMonitorsDetected,

    #[error("Échec de sauvegarde de la preuve d'infraction")]
    EvidenceStorageError,

    #[error("URL Moodle invalide ou non sécurisée (SSRF bloqué par la politique de sécurité)")]
    InvalidMoodleUrl,
}

// -----------------------------------------------------------------------------
// 2. Modèles de Données & Métadonnées
// -----------------------------------------------------------------------------
#[derive(Serialize)]
pub struct HardwareCheckResult {
    pub is_valid: bool,
    pub monitor_count: usize,
    pub primary_monitor_name: String,
    pub message: String,
}

#[derive(Serialize, Clone)]
pub struct StrikeNotification {
    pub strike_number: u8,
    pub max_strikes: u8,
    pub reason: String,
    pub timestamp: String,
}

#[derive(Serialize, Clone)]
pub struct ProctorAlertNotification {
    pub attempt_id: u64,
    pub strike_number: u8,
    pub reason: String,
    pub evidence_path: Option<String>,
    pub timestamp: String,
    pub status: String,
}

#[derive(Deserialize, Zeroize, ZeroizeOnDrop)]
pub struct MoodleCredentials {
    pub moodle_url: String,
    pub wstoken: String,
}

pub struct ExamState {
    pub is_locked: AtomicBool,
}

impl Default for ExamState {
    fn default() -> Self {
        Self {
            is_locked: AtomicBool::new(false), // Déverrouillé pendant le Pre-Flight Check
        }
    }
}

// -----------------------------------------------------------------------------
// 3. Commandes Tauri Invoquées depuis le Frontend
// -----------------------------------------------------------------------------

/// Vérifie que l'étudiant dispose strictement d'un seul écran physique (Anti-Dual Monitor)
#[tauri::command]
async fn verifier_materiel(app: AppHandle) -> Result<HardwareCheckResult, ProctorError> {
    let main_window = app.get_webview_window("main").ok_or(ProctorError::WindowError)?;
    let monitors = main_window.available_monitors().map_err(|_| ProctorError::WindowError)?;
    let count = monitors.len();

    let primary_name = monitors
        .first()
        .and_then(|m| m.name())
        .cloned()
        .unwrap_or_else(|| "Écran principal".to_string());

    if count > 1 {
        tracing::warn!(
            monitor_count = count,
            "Tentative de lancement avec plusieurs écrans connectés."
        );
        Ok(HardwareCheckResult {
            is_valid: false,
            monitor_count: count,
            primary_monitor_name: primary_name,
            message: format!(
                "{} écrans détectés. Veuillez débrancher tous vos écrans secondaires (HDMI, DisplayPort, AirPlay).",
                count
            ),
        })
    } else {
        tracing::info!("Vérification matérielle réussie : 1 seul écran détecté.");
        Ok(HardwareCheckResult {
            is_valid: true,
            monitor_count: count,
            primary_monitor_name: primary_name,
            message: "Configuration matérielle validée (Écran unique).".into(),
        })
    }
}

/// Verrouille l'application en mode Kiosk au démarrage effectif de l'examen
#[tauri::command]
async fn verrouiller_examen(app: AppHandle) -> Result<(), ProctorError> {
    if let Some(state) = app.try_state::<ExamState>() {
        state.is_locked.store(true, Ordering::SeqCst);
    }

    if let Some(main_window) = app.get_webview_window("main") {
        let _ = main_window.set_fullscreen(true);
        let _ = main_window.set_decorations(false);
        let _ = main_window.set_always_on_top(true);
        let _ = main_window.set_resizable(false);
        let _ = main_window.set_focus();
    }

    // Boucle de surveillance active du confinement Kiosk (Watchdog anti-évasion)
    let app_clone = app.clone();
    tauri::async_runtime::spawn(async move {
        loop {
            tokio::time::sleep(tokio::time::Duration::from_millis(400)).await;
            let is_locked = app_clone
                .try_state::<ExamState>()
                .map(|state| state.is_locked.load(Ordering::SeqCst))
                .unwrap_or(false);

            if !is_locked {
                break;
            }

            if let Some(window) = app_clone.get_webview_window("main") {
                if let Ok(is_minimized) = window.is_minimized() {
                    if is_minimized {
                        let _ = window.unminimize();
                        let _ = window.set_fullscreen(true);
                        let _ = window.set_focus();
                    }
                }
                if let Ok(is_focused) = window.is_focused() {
                    if !is_focused {
                        let _ = window.set_always_on_top(true);
                        let _ = window.set_focus();
                    }
                }
            }
        }
    });

    tracing::info!("Examen démarré : Mode Kiosk et confinement actif en boucle.");
    Ok(())
}

/// Enregistre une capture webcam d'infraction comme preuve légale horodatée
#[tauri::command]
async fn enregistrer_preuve(
    app: AppHandle,
    attempt_id: u64,
    strike_number: u8,
    image_base64: String,
    motif: String,
) -> Result<String, ProctorError> {
    tracing::warn!(
        attempt_id = attempt_id,
        strike = strike_number,
        motif = %motif,
        "ENREGISTREMENT PREUVE D'INFRACTION (SNAPSHOT AUDIT TRAIL)"
    );

    // Répertoire sécurisé des preuves dans app_data
    let app_data_dir = app
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("./evidence"));
    let evidence_dir = app_data_dir.join("evidence").join(attempt_id.to_string());

    fs::create_dir_all(&evidence_dir).map_err(|_| ProctorError::EvidenceStorageError)?;

    // Nettoyer le préfixe data:image/jpeg;base64, si présent
    let clean_base64 = if let Some(idx) = image_base64.find(',') {
        &image_base64[idx + 1..]
    } else {
        &image_base64
    };

    // Décodage de l'image
    use base64::{engine::general_purpose::STANDARD, Engine as _};
    let image_bytes = STANDARD
        .decode(clean_base64.trim())
        .map_err(|_| ProctorError::EvidenceStorageError)?;

    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S").to_string();
    let filename = format!("strike_{}_{}.jpg", strike_number, timestamp);
    let file_path = evidence_dir.join(&filename);

    // Calcul de l'empreinte cryptographique SHA-256 (Inviolabilité des preuves d'audit)
    let hash_hex = format!("{:x}", Sha256::digest(&image_bytes));
    let manifest_filename = format!("strike_{}_{}.sha256", strike_number, timestamp);
    let manifest_path = evidence_dir.join(&manifest_filename);

    fs::write(&file_path, &image_bytes).map_err(|_| ProctorError::EvidenceStorageError)?;
    fs::write(&manifest_path, format!("{}  {}\n", hash_hex, filename))
        .map_err(|_| ProctorError::EvidenceStorageError)?;

    tracing::info!(
        path = ?file_path,
        sha256 = %hash_hex,
        "Preuve sauvegardée et scellée cryptographiquement avec succès"
    );
    Ok(file_path.to_string_lossy().to_string())
}

/// Valide et assainit l'URL Moodle pour bloquer les attaques SSRF (CWE-918)
fn valider_url_moodle(url: &str) -> Result<String, ProctorError> {
    let parsed = reqwest::Url::parse(url.trim()).map_err(|_| ProctorError::InvalidMoodleUrl)?;

    let is_https = parsed.scheme() == "https";
    let host_str = parsed.host_str().ok_or(ProctorError::InvalidMoodleUrl)?;
    let is_local_dev = host_str == "localhost" || host_str == "127.0.0.1";

    if !is_https && !is_local_dev {
        tracing::error!(url = %url, "SSRF Guard : Le protocole doit obligatoirement être HTTPS.");
        return Err(ProctorError::InvalidMoodleUrl);
    }

    if !is_local_dev {
        let lower = host_str.to_lowercase();
        // Bloquer IPv6 loopback, cloud metadata et plages RFC1918
        let forbidden_targets = [
            "169.254.169.254", // AWS/GCP/Azure Metadata
            "metadata.google.internal",
            "127.0.0.1",
            "localhost",
            "0.0.0.0",
            "::1",
            "10.",
            "192.168.",
            "127.",
        ];

        for target in &forbidden_targets {
            if lower.contains(target) || lower.ends_with(".internal") || lower.ends_with(".local") {
                tracing::error!(url = %url, target = %target, "SSRF Guard : Tentative de ciblage d'adresse privée ou de métadonnées bloquée.");
                return Err(ProctorError::InvalidMoodleUrl);
            }
        }

        // Vérification de la plage RFC1918 172.16.0.0/12 (172.16.x.x à 172.31.x.x)
        if lower.starts_with("172.") {
            let parts: Vec<&str> = lower.split('.').collect();
            if parts.len() >= 2 {
                if let Ok(second_octet) = parts[1].parse::<u8>() {
                    if (16..=31).contains(&second_octet) {
                        tracing::error!(url = %url, "SSRF Guard : Plage RFC1918 172.16-31.x.x bloquée.");
                        return Err(ProctorError::InvalidMoodleUrl);
                    }
                }
            }
        }
    }

    let port_suffix = if let Some(p) = parsed.port() {
        format!(":{}", p)
    } else {
        "".to_string()
    };
    Ok(format!("{}://{}{}", parsed.scheme(), host_str, port_suffix))
}

/// Commande déclenchée lors du 3ème avertissement (Kill Switch Moodle)
#[tauri::command]
async fn expulser_etudiant(
    app: AppHandle,
    moodle_url: String,
    wstoken: String,
    attempt_id: u64,
    motif: String,
) -> Result<String, ProctorError> {
    tracing::error!(
        attempt_id = attempt_id,
        motif = %motif,
        "EXPULSION ÉTUDIANT DÉCLENCHÉE - Soumission immédiate sur Moodle"
    );

    // Validation stricte anti-SSRF avant toute émission réseau
    let safe_moodle_url = valider_url_moodle(&moodle_url)?;

    // Encapsulation sécurisée du token avec effacement automatique de la RAM à la libération
    let wstoken_secure = Zeroizing::new(wstoken);

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|_| ProctorError::NetworkError)?;

    let endpoint = format!("{}/webservice/rest/server.php", safe_moodle_url);

    let params = [
        ("wstoken", wstoken_secure.as_str()),
        ("wsfunction", "mod_quiz_process_attempt"),
        ("moodlewsrestformat", "json"),
        ("attemptid", &attempt_id.to_string()),
        ("finishattempt", "1"),
        ("timeup", "0"),
    ];

    let response = client
        .post(&endpoint)
        .form(&params)
        .send()
        .await
        .map_err(|e| {
            tracing::error!("Échec requête Moodle finishattempt: {:?}", e);
            ProctorError::MoodleApiError
        })?;

    if !response.status().is_success() {
        tracing::error!("Moodle a retourné un code HTTP non-200: {}", response.status());
        return Err(ProctorError::MoodleApiError);
    }

    if let Some(state) = app.try_state::<ExamState>() {
        state.is_locked.store(false, Ordering::SeqCst);
    }

    let _ = app.emit("exam_terminated", "Examen clôturé pour infraction répétée");
    app.exit(0);

    Ok("Examen soumis et clôturé sur Moodle avec succès".into())
}

/// Signale un avertissement (Strike 1 ou 2)
#[tauri::command]
async fn signaler_avertissement(
    app: AppHandle,
    attempt_id: u64,
    strike_count: u8,
    motif: String,
) -> Result<(), ProctorError> {
    tracing::warn!(
        attempt_id = attempt_id,
        strike = strike_count,
        motif = %motif,
        "Avertissement de télésurveillance enregistré"
    );

    let notification = StrikeNotification {
        strike_number: strike_count,
        max_strikes: 3,
        reason: motif,
        timestamp: chrono::Utc::now().to_rfc3339(),
    };

    app.emit("strike_detected", &notification)
        .map_err(|_| ProctorError::WindowError)?;

    Ok(())
}

/// Alerte un surveillant humain sans expulser l'étudiant (Conforme RGPD & Human-in-the-Loop)
#[tauri::command]
async fn alerter_surveillant(
    app: AppHandle,
    attempt_id: u64,
    strike_count: u8,
    motif: String,
    evidence_path: Option<String>,
) -> Result<(), ProctorError> {
    tracing::warn!(
        attempt_id = attempt_id,
        strike = strike_count,
        motif = %motif,
        "ALERTE SURVEILLANT HUMAIN ENVOYÉE (Human-in-the-Loop - Examen maintenu actif)"
    );

    let notification = ProctorAlertNotification {
        attempt_id,
        strike_number: strike_count,
        reason: motif,
        evidence_path,
        timestamp: chrono::Utc::now().to_rfc3339(),
        status: "flagged_for_human_review".to_string(),
    };

    app.emit("proctor_alert", &notification)
        .map_err(|_| ProctorError::WindowError)?;

    Ok(())
}

// -----------------------------------------------------------------------------
// 4. Point d'Entrée Principal & Runtime Tauri
// -----------------------------------------------------------------------------
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(ExamState::default())
        .invoke_handler(tauri::generate_handler![
            verifier_materiel,
            verrouiller_examen,
            enregistrer_preuve,
            expulser_etudiant,
            signaler_avertissement,
            alerter_surveillant
        ])
        .setup(|app| {
            if let Some(main_window) = app.get_webview_window("main") {
                // Focus initial
                let _ = main_window.set_focus();
                tracing::info!("Application AgoraExam initialisée.");
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            match event {
                WindowEvent::CloseRequested { api, .. } => {
                    let app_handle = window.app_handle();
                    let is_locked = app_handle
                        .try_state::<ExamState>()
                        .map(|state| state.is_locked.load(Ordering::SeqCst))
                        .unwrap_or(false);

                    if is_locked {
                        api.prevent_close();
                        tracing::warn!("Tentative de fermeture non autorisée bloquée par le mode Kiosk.");
                        let _ = window.emit("security_violation", "Fermeture interdite pendant l'examen");
                    }
                }

                WindowEvent::Focused(is_focused) => {
                    let app_handle = window.app_handle();
                    let is_locked = app_handle
                        .try_state::<ExamState>()
                        .map(|state| state.is_locked.load(Ordering::SeqCst))
                        .unwrap_or(false);

                    if is_locked && !is_focused {
                        tracing::warn!("Perte de focus de la fenêtre d'examen détectée ! Recapture forcée.");
                        let _ = window.emit("window_focus_lost", "L'étudiant a quitté la fenêtre active");

                        let win = window.clone();
                        tauri::async_runtime::spawn(async move {
                            for _ in 0..3 {
                                let _ = win.unminimize();
                                let _ = win.set_always_on_top(true);
                                let _ = win.set_focus();
                                tokio::time::sleep(tokio::time::Duration::from_millis(80)).await;
                            }
                        });
                    }
                }

                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("Erreur fatale lors de l'exécution de l'application AgoraExam");
}
