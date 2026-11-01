use crate::error::ProctorError;
use std::net::IpAddr;
use std::str::FromStr;
use zeroize::Zeroizing;

/// Valide et assainit l'URL Moodle pour bloquer les attaques SSRF (CWE-918)
/// Utilise un parsing IP strict pour bloquer les adresses privées sans faux positifs sur les domaines
pub fn valider_url_moodle(url: &str) -> Result<String, ProctorError> {
    let parsed = reqwest::Url::parse(url.trim()).map_err(|_| ProctorError::InvalidMoodleUrl)?;

    let is_https = parsed.scheme() == "https";
    let host_str = parsed.host_str().ok_or(ProctorError::InvalidMoodleUrl)?;
    let lower_host = host_str.to_lowercase();
    let is_local_dev = lower_host == "localhost" || lower_host == "127.0.0.1";

    if !is_https && !is_local_dev {
        tracing::error!(url = %url, "SSRF Guard : Le protocole doit obligatoirement être HTTPS.");
        return Err(ProctorError::InvalidMoodleUrl);
    }

    if !is_local_dev {
        // 1. Contrôle par parsing IP strict (élimine les faux positifs sur les noms de domaine tels que univ-paris10.fr)
        if let Ok(ip) = IpAddr::from_str(&lower_host) {
            match ip {
                IpAddr::V4(ipv4) => {
                    let octets = ipv4.octets();
                    let is_loopback = octets[0] == 127;
                    let is_unspecified = octets[0] == 0;
                    let is_broadcast = ipv4.is_broadcast();
                    let is_rfc1918 = octets[0] == 10
                        || (octets[0] == 172 && (16..=31).contains(&octets[1]))
                        || (octets[0] == 192 && octets[1] == 168);
                    let is_link_local = octets[0] == 169 && octets[1] == 254;
                    let is_cgnat = octets[0] == 100 && (64..=127).contains(&octets[1]);

                    if is_loopback || is_unspecified || is_broadcast || is_rfc1918 || is_link_local || is_cgnat {
                        tracing::error!(
                            url = %url,
                            ip = %ipv4,
                            "SSRF Guard : Adresse IPv4 privée, locale ou métadonnées cloud bloquée."
                        );
                        return Err(ProctorError::InvalidMoodleUrl);
                    }
                }
                IpAddr::V6(ipv6) => {
                    let is_loopback = ipv6.is_loopback();
                    let is_unspecified = ipv6.is_unspecified();
                    let is_unique_local = (ipv6.segments()[0] & 0xfe00) == 0xfc00;
                    let is_link_local = (ipv6.segments()[0] & 0xffc0) == 0xfe80;

                    if is_loopback || is_unspecified || is_unique_local || is_link_local {
                        tracing::error!(
                            url = %url,
                            ip = %ipv6,
                            "SSRF Guard : Adresse IPv6 privée ou loopback bloquée."
                        );
                        return Err(ProctorError::InvalidMoodleUrl);
                    }
                }
            }
        } else {
            // 2. Si c'est un nom d'hôte / domaine : filtrer les métadonnées cloud et suffixes locaux
            let forbidden_metadata_domains = [
                "metadata.google.internal",
                "instance-data",
                "metadata.azure.com",
            ];
            for target in &forbidden_metadata_domains {
                if lower_host == *target || lower_host.ends_with(&format!(".{}", target)) {
                    tracing::error!(url = %url, target = %target, "SSRF Guard : Métadonnées cloud bloquées.");
                    return Err(ProctorError::InvalidMoodleUrl);
                }
            }

            // Bloquer les suffixes de réseau local / mDNS (sans bloquer des TLDs légitimes)
            if lower_host.ends_with(".internal")
                || lower_host.ends_with(".local")
                || lower_host.ends_with(".localhost")
                || lower_host.ends_with(".lan")
                || lower_host == "localhost"
            {
                tracing::error!(url = %url, host = %lower_host, "SSRF Guard : Domaine local/interne bloqué.");
                return Err(ProctorError::InvalidMoodleUrl);
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valider_url_moodle_autorise_domaines_avec_chiffres() {
        // univ-paris10.fr ne doit PAS être bloqué par une règle "10."
        let res = valider_url_moodle("https://moodle.univ-paris10.fr/quiz");
        assert!(res.is_ok(), "moodle.univ-paris10.fr devrait être accepté");
        assert_eq!(res.unwrap(), "https://moodle.univ-paris10.fr");

        let res2 = valider_url_moodle("https://top10.education.gouv.fr/examen");
        assert!(res2.is_ok(), "top10.education.gouv.fr devrait être accepté");
    }

    #[test]
    fn test_valider_url_moodle_bloque_ips_privees_et_metadata() {
        // 10.0.0.1 (RFC1918)
        assert!(valider_url_moodle("https://10.0.0.1/webservice").is_err());
        // 172.16.0.1 (RFC1918)
        assert!(valider_url_moodle("https://172.16.0.1/webservice").is_err());
        assert!(valider_url_moodle("https://172.31.255.254/webservice").is_err());
        // 192.168.1.1 (RFC1918)
        assert!(valider_url_moodle("https://192.168.1.1/webservice").is_err());
        // 169.254.169.254 (Cloud metadata)
        assert!(valider_url_moodle("https://169.254.169.254/latest/meta-data").is_err());
        // Loopback 127.0.0.1
        assert!(valider_url_moodle("https://127.0.0.2/test").is_err());
        // metadata hostname
        assert!(valider_url_moodle("https://metadata.google.internal/test").is_err());
        // internal domain
        assert!(valider_url_moodle("https://moodle.corp.internal").is_err());
    }
}
