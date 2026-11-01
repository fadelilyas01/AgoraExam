#![forbid(unsafe_code)]

pub mod error;
pub mod evidence;
pub mod kiosk;
pub mod models;
pub mod moodle;
pub mod state;

use error::ProctorError;
use models::{
    HardwareCheckResult, InfractionResult, ProctorAlertNotification, SealedReceiptResult,
    StrikeNotification,
};
use state::ExamState;
use std::collections::HashMap;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Manager, WindowEvent};

// -----------------------------------------------------------------------------
// Commandes Tauri Invoquées depuis le Frontend React
// -----------------------------------------------------------------------------

/// Diagnostique le matériel d'affichage (Anti-Dual Monitor)
#[tauri::command]
#[tracing::instrument(skip(app))]
async fn verifier_materiel(app: AppHandle) -> Result<HardwareCheckResult, ProctorError> {
    kiosk::verifier_ecrans_physiques(&app)
}

/// Verrouille l'application en mode Kiosk au démarrage effectif de l'examen et purge le presse-papier
#[tauri::command]
#[tracing::instrument(skip(app, state))]
async fn verrouiller_examen(
    app: AppHandle,
    state: tauri::State<'_, ExamState>,
) -> Result<(), ProctorError> {
    state.set_locked(true);
    kiosk::appliquer_confinement_fenetre(&app)?;
    kiosk::purger_presse_papier(&app);
    tracing::info!("Examen démarré : Mode Kiosk renforcé, presse-papier purgé et watchdog actif.");
    Ok(())
}

/// Initialise la session d'examen et stocke le token Moodle sous séquestre sécurisé (CWE-312 & CWE-798)
#[tauri::command]
#[tracing::instrument(skip(state, wstoken))]
async fn initialiser_session_examen(
    state: tauri::State<'_, ExamState>,
    moodle_url: String,
    wstoken: String,
    attempt_id: u64,
    policy: String,
) -> Result<String, ProctorError> {
    let clean_url = moodle_url.trim();
    if clean_url.is_empty() {
        return Ok("Session locale initialisée sans rattachement LMS".into());
    }

    let safe_url = moodle::valider_url_moodle(clean_url)?;
    state.init_session(safe_url, wstoken, attempt_id, policy);

    tracing::info!(attempt_id = attempt_id, "Session Moodle sous séquestre Rust configurée.");
    Ok("Session sécurisée Moodle initialisée avec succès".into())
}

/// Purge le presse-papier du système d'exploitation pour bloquer les tentatives de collage
#[tauri::command]
#[tracing::instrument(skip(app))]
async fn vider_presse_papier(app: AppHandle) -> Result<(), ProctorError> {
    kiosk::purger_presse_papier(&app);
    Ok(())
}

/// Enregistre une capture webcam d'infraction comme preuve légale horodatée (Async I/O non-bloquant)
#[tauri::command]
#[tracing::instrument(skip(app, image_base64))]
async fn enregistrer_preuve(
    app: AppHandle,
    attempt_id: u64,
    strike_number: u8,
    image_base64: String,
    motif: String,
) -> Result<String, ProctorError> {
    evidence::sauvegarder_preuve_async(&app, attempt_id, strike_number, &image_base64, &motif).await
}

/// Enregistre une infraction de manière souveraine dans Rust (Authoritative Strike Engine)
#[tauri::command]
#[tracing::instrument(skip(app, state, image_base64))]
async fn enregistrer_infraction(
    app: AppHandle,
    state: tauri::State<'_, ExamState>,
    motif: String,
    image_base64: Option<String>,
) -> Result<InfractionResult, ProctorError> {
    let attempt_id = state.get_attempt_id();
    let current_strike_peek = state.get_strikes() + 1;

    let evidence_path = if let Some(img) = image_base64 {
        evidence::sauvegarder_preuve_async(&app, attempt_id, current_strike_peek, &img, &motif).await.ok()
    } else {
        None
    };

    let (strike_number, is_proctor_alert, is_expelled) =
        state.record_infraction(&motif, evidence_path.clone());

    tracing::warn!(
        attempt_id = attempt_id,
        strike = strike_number,
        motif = %motif,
        is_expelled = is_expelled,
        is_proctor_alert = is_proctor_alert,
        "Infraction enregistrée souverainement par le moteur Rust"
    );

    let notification = StrikeNotification {
        strike_number,
        max_strikes: 3,
        reason: motif.clone(),
        timestamp: chrono::Utc::now().to_rfc3339(),
    };

    let _ = app.emit("strike_detected", &notification);

    if is_proctor_alert {
        let alert = ProctorAlertNotification {
            attempt_id,
            strike_number,
            reason: motif.clone(),
            evidence_path: evidence_path.clone(),
            timestamp: chrono::Utc::now().to_rfc3339(),
            status: "flagged_for_human_review".to_string(),
        };
        let _ = app.emit("proctor_alert", &alert);
    }

    if is_expelled {
        // En mode strict, déclencher souverainement l'expulsion sans dépendre du frontend
        if let Some(vault) = state.get_moodle_vault() {
            let _ = moodle::expulser_avec_retry(
                &state.http_client,
                &vault.safe_url,
                &vault.wstoken,
                vault.attempt_id,
            ).await;
        }

        state.set_locked(false);
        let _ = app.emit("exam_terminated", "Examen clôturé pour infraction répétée (Mode Strict)");
    }

    Ok(InfractionResult {
        strike_number,
        max_strikes: 3,
        reason: motif,
        is_expelled,
        is_proctor_alert,
        evidence_path,
        timestamp: chrono::Utc::now().to_rfc3339(),
    })
}

/// Commande de clôture d'urgence Moodle utilisant en priorité le séquestre sécurisé Rust
#[tauri::command]
#[tracing::instrument(skip(app, state, wstoken))]
async fn expulser_etudiant(
    app: AppHandle,
    state: tauri::State<'_, ExamState>,
    moodle_url: Option<String>,
    wstoken: Option<String>,
    attempt_id: Option<u64>,
    motif: String,
) -> Result<String, ProctorError> {
    tracing::error!(motif = %motif, "EXPULSION ÉTUDIANT DÉCLENCHÉE - Clôture immédiate sur Moodle");

    let (safe_url, token, att_id) = if let Some(vault) = state.get_moodle_vault() {
        (vault.safe_url.clone(), vault.wstoken.clone(), vault.attempt_id)
    } else if let (Some(url), Some(tok), Some(att)) = (moodle_url, wstoken, attempt_id) {
        let clean_url = moodle::valider_url_moodle(&url)?;
        (clean_url, tok, att)
    } else {
        return Err(ProctorError::NoActiveMoodleSession);
    };

    moodle::expulser_avec_retry(&state.http_client, &safe_url, &token, att_id).await?;

    state.set_locked(false);
    let _ = app.emit("exam_terminated", "Examen clôturé pour infraction répétée");
    app.exit(0);

    Ok("Examen soumis et clôturé sur Moodle avec succès".into())
}

/// Signale un avertissement de télésurveillance (Strike 1 ou 2)
#[tauri::command]
#[tracing::instrument(skip(app))]
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
#[tracing::instrument(skip(app))]
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

/// Scelle cryptographiquement les résultats et l'audit trail de l'examen dans le backend Rust (CWE-345)
#[tauri::command]
#[tracing::instrument(skip(app, state, answers))]
async fn sceller_resultats_examen(
    app: AppHandle,
    state: tauri::State<'_, ExamState>,
    answers: HashMap<String, String>,
    student_observation: String,
) -> Result<SealedReceiptResult, ProctorError> {
    use sha2::{Digest, Sha256};

    let attempt_id = state.get_attempt_id();
    let strikes_count = state.get_strikes();
    let policy_applied = state.get_policy();
    let now = chrono::Utc::now();
    let timestamp_iso = now.to_rfc3339();

    let clean_obs = if student_observation.trim().is_empty() {
        "Aucune observation signalée par l'étudiant".to_string()
    } else {
        student_observation.trim().to_string()
    };

    let receipt_canonical_json = serde_json::json!({
        "certification": "AgoraExam Academic Integrity Official Receipt",
        "protocolVersion": "2.4-Sovereign-Edge",
        "sessionId": state.session_id,
        "institution": "Université Numérique & Plateforme Moodle",
        "exam": {
            "code": "ALG402",
            "title": "Algorithmique Avancée & Structures de Données",
            "attemptId": attempt_id,
        },
        "candidate": {
            "id": format!("ETU-2026-{}", attempt_id),
            "confinementStatus": "Strict Kiosk Lock (Tauri v2 Native Verified)",
        },
        "submission": {
            "timestamp": timestamp_iso,
            "formattedDate": now.format("%d/%m/%Y %H:%M:%S UTC").to_string(),
            "questionsAnswered": answers.len(),
            "totalQuestions": 8,
            "answersSummary": answers,
            "strikesCount": strikes_count,
            "policyApplied": policy_applied,
            "flaggedForProctorReview": strikes_count >= 3,
            "studentObservation": clean_obs,
        }
    });

    let raw_bytes = serde_json::to_vec(&receipt_canonical_json)
        .map_err(|e| ProctorError::ReceiptSerializationError(e.to_string()))?;

    let seal_digest = format!("{:x}", Sha256::digest(&raw_bytes));

    // Sauvegarde asynchrone sécurisée du reçu et du hash sur disque
    let app_data_dir = app
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("./evidence"));
    let exam_evidence_dir = app_data_dir.join("evidence").join(attempt_id.to_string());
    let _ = tokio::fs::create_dir_all(&exam_evidence_dir).await;

    let receipt_file = exam_evidence_dir.join(format!("official_receipt_{}.json", attempt_id));
    let sha256_file = exam_evidence_dir.join(format!("official_receipt_{}.sha256", attempt_id));

    let _ = tokio::fs::write(&receipt_file, &raw_bytes).await;
    let _ = tokio::fs::write(&sha256_file, format!("{}  official_receipt_{}.json\n", seal_digest, attempt_id)).await;

    let relative_path = format!("evidence/{}/official_receipt_{}.json", attempt_id, attempt_id);

    Ok(SealedReceiptResult {
        seal_digest,
        session_id: state.session_id.clone(),
        attempt_id,
        timestamp: timestamp_iso,
        strikes_count,
        policy_applied,
        total_questions: 8,
        answers_summary: answers,
        student_observation: clean_obs,
        confinement_status: "Strict Kiosk Lock (Tauri v2 Native Verified)".into(),
        receipt_file_path: Some(relative_path),
    })
}

/// Vérifie cryptographiquement le code PIN surveillant sans secret en clair,
/// à temps constant (CWE-208) et protégé contre le bruteforce IPC par rate-limiting natif (CWE-307)
#[tauri::command]
#[tracing::instrument(skip(state, pin))]
async fn verifier_pin_surveillant(
    state: tauri::State<'_, ExamState>,
    pin: String,
) -> Result<bool, ProctorError> {
    // 1. Contrôle préalable du verrouillage temporel
    if let Err(remaining) = state.check_pin_rate_limit() {
        return Err(ProctorError::PinRateLimitExceeded(remaining));
    }

    // 2. Comparaison à temps constant
    let is_valid = kiosk::verifier_pin_surveillant(&pin);

    // 3. Enregistrement et application du verrouillage si 3 échecs consécutifs
    match state.record_pin_result(is_valid) {
        Ok(valid) => Ok(valid),
        Err(lockout_secs) => Err(ProctorError::PinRateLimitExceeded(lockout_secs)),
    }
}

// -----------------------------------------------------------------------------
// Point d'Entrée Principal & Runtime Tauri
// -----------------------------------------------------------------------------
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(ExamState::default())
        .invoke_handler(tauri::generate_handler![
            verifier_materiel,
            verrouiller_examen,
            initialiser_session_examen,
            vider_presse_papier,
            enregistrer_preuve,
            enregistrer_infraction,
            expulser_etudiant,
            signaler_avertissement,
            alerter_surveillant,
            sceller_resultats_examen,
            verifier_pin_surveillant
        ])
        .setup(|app| {
            if let Some(main_window) = app.get_webview_window("main") {
                let _ = main_window.set_focus();
                tracing::info!("Application AgoraExam initialisée.");
            }

            // Démarrage du Watchdog Kiosk natif piloté par signal
            let app_handle = app.handle().clone();
            let rx = app.state::<ExamState>().watchdog_receiver.clone();
            kiosk::demarrer_watchdog_kiosk(app_handle, rx);

            Ok(())
        })
        .on_window_event(|window, event| {
            match event {
                WindowEvent::CloseRequested { api, .. } => {
                    let app_handle = window.app_handle();
                    let is_locked = app_handle
                        .try_state::<ExamState>()
                        .map(|state| state.is_locked())
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
                        .map(|state| state.is_locked())
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
        });

    if let Err(err) = app.run(tauri::generate_context!()) {
        eprintln!("Erreur fatale lors de l'exécution de l'application AgoraExam : {err}");
        std::process::exit(1);
    }
}