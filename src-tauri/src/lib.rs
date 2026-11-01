#![forbid(unsafe_code)]

pub mod error;
pub mod evidence;
pub mod kiosk;
pub mod models;
pub mod moodle;
pub mod state;

use error::ProctorError;
use models::{HardwareCheckResult, ProctorAlertNotification, StrikeNotification};
use state::ExamState;
use tauri::{AppHandle, Emitter, Manager, WindowEvent};

// -----------------------------------------------------------------------------
// Commandes Tauri InvoquÃ©es depuis le Frontend React
// -----------------------------------------------------------------------------

/// Diagnostique le matÃ©riel d'affichage (Anti-Dual Monitor)
#[tauri::command]
#[tracing::instrument(skip(app))]
async fn verifier_materiel(app: AppHandle) -> Result<HardwareCheckResult, ProctorError> {
    kiosk::verifier_ecrans_physiques(&app)
}

/// Verrouille l'application en mode Kiosk au dÃ©marrage effectif de l'examen
#[tauri::command]
#[tracing::instrument(skip(app, state))]
async fn verrouiller_examen(
    app: AppHandle,
    state: tauri::State<'_, ExamState>,
) -> Result<(), ProctorError> {
    state.set_locked(true);
    kiosk::appliquer_confinement_fenetre(&app)?;
    tracing::info!("Examen dÃ©marrÃ© : Mode Kiosk renforcÃ© et watchdog actif.");
    Ok(())
}

/// Enregistre une capture webcam d'infraction comme preuve lÃ©gale horodatÃ©e (Async I/O non-bloquant)
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

/// Commande dÃ©clenchÃ©e lors du 3Ã¨me avertissement (Kill Switch Moodle avec Retry Policy)
#[tauri::command]
#[tracing::instrument(skip(app, state, wstoken))]
async fn expulser_etudiant(
    app: AppHandle,
    state: tauri::State<'_, ExamState>,
    moodle_url: String,
    wstoken: String,
    attempt_id: u64,
    motif: String,
) -> Result<String, ProctorError> {
    tracing::error!(
        attempt_id = attempt_id,
        motif = %motif,
        "EXPULSION Ã‰TUDIANT DÃ‰CLENCHÃ‰E - ClÃ´ture immÃ©diate sur Moodle"
    );

    // Validation stricte anti-SSRF avant toute Ã©mission rÃ©seau
    let safe_url = moodle::valider_url_moodle(&moodle_url)?;

    // Envoi avec politique de retry automatique et backoff exponentiel
    moodle::expulser_avec_retry(&state.http_client, &safe_url, &wstoken, attempt_id).await?;

    state.set_locked(false);
    let _ = app.emit("exam_terminated", "Examen clÃ´turÃ© pour infraction rÃ©pÃ©tÃ©e");
    app.exit(0);

    Ok("Examen soumis et clÃ´turÃ© sur Moodle avec succÃ¨s".into())
}

/// Signale un avertissement de tÃ©lÃ©surveillance (Strike 1 ou 2)
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
        "Avertissement de tÃ©lÃ©surveillance enregistrÃ©"
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

/// Alerte un surveillant humain sans expulser l'Ã©tudiant (Conforme RGPD & Human-in-the-Loop)
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
        "ALERTE SURVEILLANT HUMAIN ENVOYÃ‰E (Human-in-the-Loop - Examen maintenu actif)"
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

/// Vérifie cryptographiquement le code PIN surveillant sans secret en clair (CWE-798)
#[tauri::command]
#[tracing::instrument(skip(pin))]
async fn verifier_pin_surveillant(pin: String) -> Result<bool, ProctorError> {
    Ok(kiosk::verifier_pin_surveillant(&pin))
}

// -----------------------------------------------------------------------------
// Point d'EntrÃ©e Principal & Runtime Tauri
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
            alerter_surveillant,
            verifier_pin_surveillant
        ])
        .setup(|app| {
            if let Some(main_window) = app.get_webview_window("main") {
                let _ = main_window.set_focus();
                tracing::info!("Application AgoraExam initialisÃ©e.");
            }

            // DÃ©marrage du Watchdog Kiosk natif pilotÃ© par signal
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
                        tracing::warn!("Tentative de fermeture non autorisÃ©e bloquÃ©e par le mode Kiosk.");
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
                        tracing::warn!("Perte de focus de la fenÃªtre d'examen dÃ©tectÃ©e ! Recapture forcÃ©e.");
                        let _ = window.emit("window_focus_lost", "L'Ã©tudiant a quittÃ© la fenÃªtre active");

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
        .expect("Erreur fatale lors de l'exÃ©cution de l'application AgoraExam");
}
