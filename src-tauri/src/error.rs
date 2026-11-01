use serde::Serialize;
use thiserror::Error;

/// Types d'erreurs métier exhaustifs et sérialisables pour AgoraExam
#[derive(Debug, Error, Serialize)]
#[serde(tag = "code", content = "message")]
pub enum ProctorError {
    #[error("Erreur de communication avec le serveur Moodle")]
    MoodleApiError,

    #[error("Impossible de communiquer avec le réseau : {0}")]
    NetworkError(String),

    #[error("Erreur de gestion de la fenêtre ou du runtime graphique")]
    WindowError,

    #[error("Multi-écrans détecté : l'examen exige un écran physique unique")]
    MultipleMonitorsDetected,

    #[error("Échec de sauvegarde asynchrone de la preuve d'infraction : {0}")]
    EvidenceStorageError(String),

    #[error("URL Moodle invalide ou bloquée par la politique anti-SSRF (CWE-918)")]
    InvalidMoodleUrl,

    #[error("Verrouillage de sécurité actif ({0}s restantes) : trop de tentatives de code PIN")]
    PinRateLimitExceeded(u64),

    #[error("Tentative de verrouillage alors que l'examen est déjà actif")]
    AlreadyLocked,

    #[error("Aucune session Moodle active sous séquestre dans le backend Rust")]
    NoActiveMoodleSession,

    #[error("Échec de génération ou sérialisation du reçu cryptographique : {0}")]
    ReceiptSerializationError(String),
}
