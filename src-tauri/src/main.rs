// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Initialisation des logs sécurisés avec tracing
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "agora_exam=info".into()),
        )
        .init();

    tracing::info!("Démarrage du navigateur sécurisé AgoraExam...");

    // Lancement de l'application Tauri
    agora_exam_lib::run();
}
