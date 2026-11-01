use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use zeroize::{Zeroize, ZeroizeOnDrop};

/// Résultat du diagnostic matériel d'affichage
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HardwareCheckResult {
    pub is_valid: bool,
    pub monitor_count: usize,
    pub primary_monitor_name: String,
    pub message: String,
}

/// Notification d'avertissement transmise au frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StrikeNotification {
    pub strike_number: u8,
    pub max_strikes: u8,
    pub reason: String,
    pub timestamp: String,
}

/// Alerte transmise à l'arbitrage d'un surveillant humain (Human-in-the-Loop)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProctorAlertNotification {
    pub attempt_id: u64,
    pub strike_number: u8,
    pub reason: String,
    pub evidence_path: Option<String>,
    pub timestamp: String,
    pub status: String,
}

/// Événement d'infraction consigné dans l'historique sécurisé de Rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InfractionRecord {
    pub strike_number: u8,
    pub reason: String,
    pub evidence_path: Option<String>,
    pub timestamp: String,
}

/// Résultat officiel retourné par le moteur Rust lors d'une infraction
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InfractionResult {
    pub strike_number: u8,
    pub max_strikes: u8,
    pub reason: String,
    pub is_expelled: bool,
    pub is_proctor_alert: bool,
    pub evidence_path: Option<String>,
    pub timestamp: String,
}

/// Identifiants de session Moodle mis sous séquestre dans la mémoire vive Rust (CWE-312 & CWE-798)
#[derive(Clone, Zeroize, ZeroizeOnDrop)]
pub struct MoodleSessionVault {
    pub safe_url: String,
    pub wstoken: String,
    pub attempt_id: u64,
}

/// Données du reçu officiel scellé cryptographiquement par Rust (CWE-345)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SealedReceiptResult {
    pub seal_digest: String,
    pub session_id: String,
    pub attempt_id: u64,
    pub timestamp: String,
    pub strikes_count: u8,
    pub policy_applied: String,
    pub total_questions: usize,
    pub answers_summary: HashMap<String, String>,
    pub student_observation: String,
    pub confinement_status: String,
    pub receipt_file_path: Option<String>,
}

/// Identifiants Moodle protégés contre la rémanence en mémoire vive (RAM)
#[derive(Deserialize, Zeroize, ZeroizeOnDrop)]
pub struct MoodleCredentials {
    pub moodle_url: String,
    pub wstoken: String,
}
