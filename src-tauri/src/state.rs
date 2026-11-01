use std::sync::atomic::{AtomicBool, AtomicU64, AtomicU8, Ordering};
use std::sync::{Mutex, RwLock};
use std::time::Instant;
use tokio::sync::watch;
use crate::models::{InfractionRecord, MoodleSessionVault};

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
    /// Compteur officiel faisant foi des avertissements/strikes (Source de vérité Rust)
    pub strikes: AtomicU8,
    /// Identifiant officiel de la tentative d'examen Moodle
    pub attempt_id: AtomicU64,
    /// Identifiant unique de session généré au boot de l'application
    pub session_id: String,
    /// Horodatage UTC officiel du démarrage de la session
    pub start_time: chrono::DateTime<chrono::Utc>,
    /// Politique de surveillance active ("hybrid", "strict", "audit")
    pub policy: RwLock<String>,
    /// Séquestre mémoire des identifiants Moodle protégés par Zeroize (CWE-312)
    pub moodle_vault: Mutex<Option<MoodleSessionVault>>,
    /// Journal d'audit inviolable des infractions constatées
    pub infractions: Mutex<Vec<InfractionRecord>>,
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

        let now = chrono::Utc::now();
        let session_id = format!("AGORA-{}-{}", now.format("%Y%m%d"), &now.timestamp_micros().to_string()[8..]);

        Self {
            is_locked: AtomicBool::new(false),
            strikes: AtomicU8::new(0),
            attempt_id: AtomicU64::new(48291),
            session_id,
            start_time: now,
            policy: RwLock::new("hybrid".to_string()),
            moodle_vault: Mutex::new(None),
            infractions: Mutex::new(Vec::new()),
            watchdog_sender: tx,
            watchdog_receiver: rx,
            http_client: client,
            pin_rate_limiter: Mutex::new(PinRateLimiter::default()),
        }
    }
}

impl ExamState {
    /// Active ou désactive le verrouillage d'examen et réveille le watchdog
    pub fn set_locked(&self, locked: bool) {
        self.is_locked.store(locked, Ordering::SeqCst);
        let _ = self.watchdog_sender.send(locked);
    }

    /// Indique si l'examen est verrouillé
    pub fn is_locked(&self) -> bool {
        self.is_locked.load(Ordering::SeqCst)
    }

    /// Initialise la session d'examen et place le token Moodle sous séquestre mémoire protégé
    pub fn init_session(
        &self,
        safe_url: String,
        wstoken: String,
        attempt_id: u64,
        policy: String,
    ) {
        self.attempt_id.store(attempt_id, Ordering::SeqCst);
        if let Ok(mut p) = self.policy.write() {
            *p = policy;
        }

        let mut vault = self.moodle_vault.lock().unwrap_or_else(|p| p.into_inner());
        *vault = Some(MoodleSessionVault {
            safe_url,
            wstoken,
            attempt_id,
        });

        tracing::info!(attempt_id = attempt_id, "Session d'examen et séquestre Moodle initialisés dans Rust.");
    }

    /// Récupère en toute sécurité une copie du séquestre Moodle pour un appel API
    pub fn get_moodle_vault(&self) -> Option<MoodleSessionVault> {
        let vault = self.moodle_vault.lock().unwrap_or_else(|p| p.into_inner());
        vault.clone()
    }

    /// Enregistre une infraction de manière souveraine dans Rust
    /// Renvoie (strike_count, is_proctor_alert, is_expelled)
    pub fn record_infraction(&self, reason: &str, evidence_path: Option<String>) -> (u8, bool, bool) {
        let current_strike = self.strikes.fetch_add(1, Ordering::SeqCst) + 1;
        let now_str = chrono::Utc::now().to_rfc3339();

        let record = InfractionRecord {
            strike_number: current_strike,
            reason: reason.to_string(),
            evidence_path,
            timestamp: now_str,
        };

        if let Ok(mut list) = self.infractions.lock() {
            list.push(record);
        }

        let policy = self.policy.read().map(|p| p.clone()).unwrap_or_else(|_| "hybrid".to_string());

        let is_expelled = current_strike >= 3 && policy == "strict";
        let is_proctor_alert = current_strike >= 3 && policy != "strict";

        (current_strike, is_proctor_alert, is_expelled)
    }

    /// Récupère le nombre actuel d'avertissements officiel
    pub fn get_strikes(&self) -> u8 {
        self.strikes.load(Ordering::SeqCst)
    }

    /// Récupère l'ID de la tentative officielle
    pub fn get_attempt_id(&self) -> u64 {
        self.attempt_id.load(Ordering::SeqCst)
    }

    /// Récupère la politique de surveillance active
    pub fn get_policy(&self) -> String {
        self.policy.read().map(|p| p.clone()).unwrap_or_else(|_| "hybrid".to_string())
    }

    /// Récupère la liste des infractions archivées
    pub fn get_infractions(&self) -> Vec<InfractionRecord> {
        self.infractions.lock().map(|l| l.clone()).unwrap_or_default()
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
