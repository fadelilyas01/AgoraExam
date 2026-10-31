use crate::error::ProctorError;
use zeroize::Zeroizing;

/// Valide et assainit l'URL Moodle pour bloquer les attaques SSRF (CWE-918)
pub fn valider_url_moodle(url: &str) -> Result<String, ProctorError> {
    let parsed = reqwest::Url::parse(url.trim()).map_err(|_| ProctorError::InvalidMoodleUrl)?;

    let is_https = parsed.scheme() == "https";
    let host_str = parsed.host_str().ok_or(ProctorError::InvalidMoodleUrl)?;
    let is_local_dev = host_str == "localhost" || host_str == "127.0.0.1";

    if !is_https && !is_local_dev {
        tracing::error!(url = %url, "SSRF Guard : Le protocole doit obligatoirement être HTTPS.");
        return Err(ProctorError::InvalidMoodleUrl);
    }

    if !is_local_dev {
        let lower = host_str.to_lowercase();
        // Bloquer IPv6 loopback, cloud metadata et plages RFC1918
        let forbidden_targets = [
            "169.254.169.254", // AWS/GCP/Azure Metadata
            "metadata.google.internal",
            "127.0.0.1",
            "localhost",
            "0.0.0.0",
            "::1",
            "10.",
            "192.168.",
            "127.",
        ];

        for target in &forbidden_targets {
            if lower.contains(target) || lower.ends_with(".internal") || lower.ends_with(".local") {
                tracing::error!(url = %url, target = %target, "SSRF Guard : Tentative de ciblage d'adresse privée ou de métadonnées bloquée.");
                return Err(ProctorError::InvalidMoodleUrl);
            }
        }

        // Vérification de la plage RFC1918 172.16.0.0/12 (172.16.x.x à 172.31.x.x)
        if lower.starts_with("172.") {
            let parts: Vec<&str> = lower.split('.').collect();
            if parts.len() >= 2 {
                if let Ok(second_octet) = parts[1].parse::<u8>() {
                    if (16..=31).contains(&second_octet) {
                        tracing::error!(url = %url, "SSRF Guard : Plage RFC1918 172.16-31.x.x bloquée.");
                        return Err(ProctorError::InvalidMoodleUrl);
                    }
                }
            }
        }
    }

    let port_suffix = if let Some(p) = parsed.port() {
        format!(":{}", p)
    } else {
        "".to_string()
    };
    Ok(format!("{}://{}{}", parsed.scheme(), host_str, port_suffix))
}

/// Envoie la requête d'expulsion à Moodle avec politique de retry et backoff exponentiel
pub async fn expulser_avec_retry(
    client: &reqwest::Client,
    safe_moodle_url: &str,
    wstoken: &str,
    attempt_id: u64,
) -> Result<(), ProctorError> {
    let wstoken_secure = Zeroizing::new(wstoken.to_string());
    let endpoint = format!("{}/webservice/rest/server.php", safe_moodle_url);
    let attempt_str = attempt_id.to_string();

    let params = [
        ("wstoken", wstoken_secure.as_str()),
        ("wsfunction", "mod_quiz_process_attempt"),
        ("moodlewsrestformat", "json"),
        ("attemptid", &attempt_str),
        ("finishattempt", "1"),
        ("timeup", "0"),
    ];

    // Retry 3 fois avec backoff exponentiel (500ms, 1500ms, 3000ms)
    let backoffs = [
        std::time::Duration::from_millis(500),
        std::time::Duration::from_millis(1500),
        std::time::Duration::from_millis(3000),
    ];

    let mut last_err = ProctorError::MoodleApiError;

    for (attempt_num, backoff) in backoffs.iter().enumerate() {
        tracing::info!(
            attempt = attempt_num + 1,
            max_attempts = backoffs.len(),
            "Envoi de la clôture Moodle (retry policy active)..."
        );

        match client.post(&endpoint).form(&params).send().await {
            Ok(response) => {
                if response.status().is_success() {
                    tracing::info!("Moodle attempt #{} clôturée avec succès.", attempt_id);
                    return Ok(());
                } else {
                    tracing::warn!(status = %response.status(), "Code HTTP Moodle non-200 reçu.");
                    last_err = ProctorError::MoodleApiError;
                }
            }
            Err(e) => {
                tracing::warn!(error = ?e, "Échec de connexion réseau vers Moodle.");
                last_err = ProctorError::NetworkError(e.to_string());
            }
        }

        if attempt_num + 1 < backoffs.len() {
            tokio::time::sleep(*backoff).await;
        }
    }

    Err(last_err)
}
