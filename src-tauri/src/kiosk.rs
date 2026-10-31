use crate::error::ProctorError;
use crate::models::HardwareCheckResult;
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::watch;

/// Diagnostique le nombre d'écrans physiques connectés (Anti-Dual Monitor)
pub fn verifier_ecrans_physiques(app: &AppHandle) -> Result<HardwareCheckResult, ProctorError> {
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

/// Configure la fenêtre principale en mode Kiosk renforcé
pub fn appliquer_confinement_fenetre(app: &AppHandle) -> Result<(), ProctorError> {
    if let Some(main_window) = app.get_webview_window("main") {
        let _ = main_window.set_fullscreen(true);
        let _ = main_window.set_decorations(false);
        let _ = main_window.set_always_on_top(true);
        let _ = main_window.set_resizable(false);
        let _ = main_window.set_focus();
        Ok(())
    } else {
        Err(ProctorError::WindowError)
    }
}

/// Lance le Watchdog natif avec récepteur de contrôle et détection HDMI à chaud
pub fn demarrer_watchdog_kiosk(app: AppHandle, mut rx: watch::Receiver<bool>) {
    tauri::async_runtime::spawn(async move {
        tracing::info!("Watchdog Kiosk natif initialisé.");

        loop {
            // Attendre 350ms entre chaque vérification
            tokio::time::sleep(tokio::time::Duration::from_millis(350)).await;

            // Vérifier si le watchdog doit être actif
            let is_locked = *rx.borrow();
            if !is_locked {
                // Si déverrouillé, attendre la prochaine notification
                if rx.changed().await.is_err() {
                    break; // Le canal s'est fermé, terminer la tâche proprement
                }
                continue;
            }

            if let Some(window) = app.get_webview_window("main") {
                // 1. Détection dynamique anti-minimisation
                if let Ok(is_minimized) = window.is_minimized() {
                    if is_minimized {
                        let _ = window.unminimize();
                        let _ = window.set_fullscreen(true);
                        let _ = window.set_focus();
                    }
                }

                // 2. Détection dynamique de perte de focus
                if let Ok(is_focused) = window.is_focused() {
                    if !is_focused {
                        let _ = window.set_always_on_top(true);
                        let _ = window.set_focus();
                    }
                }

                // 3. Détection dynamique de branchement d'écran HDMI à chaud
                if let Ok(monitors) = window.available_monitors() {
                    if monitors.len() > 1 {
                        tracing::warn!(
                            count = monitors.len(),
                            "ALERTE KIOSK : Second écran branché à chaud pendant l'examen !"
                        );
                        let _ = window.emit(
                            "security_violation",
                            format!("Infraction matérielle : {} écrans connectés", monitors.len()),
                        );
                    }
                }
            }
        }

        tracing::info!("Watchdog Kiosk natif arrêté proprement.");
    });
}
