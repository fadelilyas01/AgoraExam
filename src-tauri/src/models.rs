use serde::{Deserialize, Serialize};
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

/// Identifiants Moodle protégés contre la rémanence en mémoire vive (RAM)
#[derive(Deserialize, Zeroize, ZeroizeOnDrop)]
pub struct MoodleCredentials {
    pub moodle_url: String,
    pub wstoken: String,
}
