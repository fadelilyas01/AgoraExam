use crate::error::ProctorError;
use base64::{engine::general_purpose::STANDARD, Engine as _};
use sha2::{Digest, Sha256};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

/// Enregistre une capture webcam d'infraction comme preuve légale horodatée de manière 100% asynchrone (tokio::fs)
pub async fn sauvegarder_preuve_async(
    app: &AppHandle,
    attempt_id: u64,
    strike_number: u8,
    image_base64: &str,
    motif: &str,
) -> Result<String, ProctorError> {
    tracing::warn!(
        attempt_id = attempt_id,
        strike = strike_number,
        motif = %motif,
        "ENREGISTREMENT PREUVE D'INFRACTION (ASYNC SNAPSHOT AUDIT TRAIL)"
    );

    let app_data_dir = app
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("./evidence"));
    let evidence_dir = app_data_dir.join("evidence").join(attempt_id.to_string());

    // Création asynchrone non-bloquante du dossier
    tokio::fs::create_dir_all(&evidence_dir)
        .await
        .map_err(|e| ProctorError::EvidenceStorageError(format!("Erreur create_dir_all: {}", e)))?;

    // Nettoyage du préfixe data:image/jpeg;base64,
    let clean_base64 = if let Some(idx) = image_base64.find(',') {
        &image_base64[idx + 1..]
    } else {
        image_base64
    };

    // Décodage standard Base64
    let image_bytes = STANDARD
        .decode(clean_base64.trim())
        .map_err(|e| ProctorError::EvidenceStorageError(format!("Erreur decodage base64: {}", e)))?;

    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S").to_string();
    let filename = format!("strike_{}_{}.jpg", strike_number, timestamp);
    let file_path = evidence_dir.join(&filename);

    // Calcul de l'empreinte cryptographique SHA-256
    let hash_hex = format!("{:x}", Sha256::digest(&image_bytes));
    let manifest_filename = format!("strike_{}_{}.sha256", strike_number, timestamp);
    let manifest_path = evidence_dir.join(&manifest_filename);

    // Écritures asynchrones concurrentes
    let write_image = tokio::fs::write(&file_path, &image_bytes);
    let write_manifest = tokio::fs::write(&manifest_path, format!("{}  {}\n", hash_hex, filename));

    tokio::try_join!(write_image, write_manifest)
        .map_err(|e| ProctorError::EvidenceStorageError(format!("Erreur écriture async: {}", e)))?;

    tracing::info!(
        path = ?file_path,
        sha256 = %hash_hex,
        "Preuve sauvegardée et scellée cryptographiquement avec succès (Async I/O)"
    );

    // Masquage du chemin absolu C:\Users\... pour empêcher la divulgation d'informations (CWE-209).
    // Retourne un identifiant de preuve relatif et neutre pour le frontend React.
    let relative_identifier = format!("evidence/{}/{}", attempt_id, filename);
    Ok(relative_identifier)
}
