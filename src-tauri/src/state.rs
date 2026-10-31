use std::sync::atomic::{AtomicBool, Ordering};
use tokio::sync::watch;

/// État global thread-safe managé par le runtime Tauri
pub struct ExamState {
    /// Indique si le mode Kiosk renforcé est actuellement actif
    pub is_locked: AtomicBool,
    /// Émetteur de signal pour contrôler ou stopper le watchdog Kiosk
    watchdog_sender: watch::Sender<bool>,
    /// Récepteur de signal partagé pour les observateurs du watchdog
    pub watchdog_receiver: watch::Receiver<bool>,
    /// Client HTTP réutilisable singleton avec pool de connexions TLS persistant
    pub http_client: reqwest::Client,
}

impl Default for ExamState {
    fn default() -> Self {
        let (tx, rx) = watch::channel(false);

        // Client HTTP singleton avec timeouts stricts et stack TLS 100% Rust
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(12))
            .connect_timeout(std::time::Duration::from_secs(5))
            .pool_idle_timeout(std::time::Duration::from_secs(90))
            .user_agent("AgoraExam-SecureClient/0.1.0")
            .build()
            .unwrap_or_else(|_| reqwest::Client::new());

        Self {
            is_locked: AtomicBool::new(false),
            watchdog_sender: tx,
            watchdog_receiver: rx,
            http_client: client,
        }
    }
}

impl ExamState {
    /// Active le verrouillage d'examen et réveille le watchdog
    pub fn set_locked(&self, locked: bool) {
        self.is_locked.store(locked, Ordering::SeqCst);
        let _ = self.watchdog_sender.send(locked);
    }

    /// Indique si l'examen est verrouillé
    pub fn is_locked(&self) -> bool {
        self.is_locked.load(Ordering::SeqCst)
    }
}
