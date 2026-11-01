use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::time::Instant;
use tokio::sync::watch;

/// Gestionnaire de Rate-Limiting pour la saisie du code PIN surveillant (CWE-307)
#[derive(Debug)]
pub struct PinRateLimiter {
    pub failed_attempts: u32,
    pub lockout_until: Option<Instant>,
}

impl Default for PinRateLimiter {
    fn default() -> Self {
        Self {
            failed_attempts: 0,
            lockout_until: None,
        }
    }
}

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
    /// Rate-limiter matériel/logiciel pour le code PIN (3 tentatives max, verrouillage 60s)
    pub pin_rate_limiter: Mutex<PinRateLimiter>,
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
            pin_rate_limiter: Mutex::new(PinRateLimiter::default()),
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

    /// Vérifie si le rate-limiting PIN autorise une nouvelle tentative (CWE-307)
    /// Renvoie Err(secondes_restantes) si verrouillé
    pub fn check_pin_rate_limit(&self) -> Result<(), u64> {
        let mut limiter = self.pin_rate_limiter.lock().unwrap_or_else(|p| p.into_inner());
        let now = Instant::now();

        if let Some(lockout_end) = limiter.lockout_until {
            if now < lockout_end {
                let remaining = lockout_end.duration_since(now).as_secs() + 1;
                return Err(remaining);
            } else {
                limiter.lockout_until = None;
                limiter.failed_attempts = 0;
            }
        }
        Ok(())
    }

    /// Enregistre le résultat de la validation PIN et applique le verrouillage si nécessaire (CWE-307)
    pub fn record_pin_result(&self, is_valid: bool) -> Result<bool, u64> {
        let mut limiter = self.pin_rate_limiter.lock().unwrap_or_else(|p| p.into_inner());
        let now = Instant::now();

        if is_valid {
            limiter.failed_attempts = 0;
            limiter.lockout_until = None;
            tracing::info!("PIN surveillant validé avec succès : compteurs de tentatives réinitialisés.");
            Ok(true)
        } else {
            limiter.failed_attempts += 1;
            tracing::warn!(
                attempts = limiter.failed_attempts,
                max = 3,
                "Échec de saisie PIN surveillant dans Rust."
            );

            if limiter.failed_attempts >= 3 {
                limiter.lockout_until = Some(now + std::time::Duration::from_secs(60));
                tracing::error!("Bruteforce Guard Rust : 3 échecs consécutifs. Verrouillage de 60 secondes enclenché.");
                Err(60)
            } else {
                Ok(false)
            }
        }
    }
}
