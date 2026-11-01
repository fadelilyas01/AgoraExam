# 🚀 Guide de Déploiement Professionnel — AgoraExam

Ce document détaille les procédures officielles de déploiement d'**AgoraExam** en environnement de production, conformément aux normes DevSecOps, au standard Zéro-Vulnérabilité et aux exigences des DSI universitaires.

---

## 🏛️ Vue d'Ensemble de l'Architecture

AgoraExam s'articule autour de deux briques de production :
1. **Le Portail Web & Sas d'Évaluation :** Interface d'accueil, documentation, bac à sable caméra et générateur de balises Moodle (hébergeable sur Vercel, conteneur Docker ou cluster Kubernetes).
2. **Le Navigateur Client Kiosk Multiplateforme :** Binaire autonome Rust/Tauri distribué aux étudiants et déployable en masse sur les postes institutionnels (MSI, NSIS, DMG, AppImage).

---

## 1. Option 1 : Déploiement Cloud PaaS (Vercel — Recommandé Web)

Le portail web est configuré pour un déploiement continu à zéro interruption sur Vercel.

* **Fichier de configuration :** [`vercel.json`](./vercel.json)
* **Headers de sécurité activés :**
  - Content-Security-Policy (CSP) stricte (sans `'unsafe-eval'`).
  - HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`.
  - Cache immuable de 1 an sur les assets statiques avec hash de compilation.
* **Procédure :**
  - Tout commit sur la branche `main` déclenche automatiquement un déploiement atomique avec aperçu de prévisualisation et bascule DNS sans coupure.

---

## 2. Option 2 : Déploiement Conteneurisé On-Premise (Docker / Nginx)

Pour les universités exigeant un hébergement 100% souverain sur leurs serveurs locaux.

### Caractéristiques de Sécurité :
- **Multi-stage build :** Compilation Node.js 20 suivie d'un export vers une image `nginx-unprivileged:alpine-slim`.
- **Utilisateur Non-Root :** Exécution sous l'UID non privilégié `101:101`.
- **Système de fichiers en lecture seule :** (`read_only: true`) avec volumes temporaires mémoires (`tmpfs`).
- **Sonde de santé intégrée :** Endpoint `/healthz` testé toutes les 30 secondes.

### Commandes de Déploiement Rapide :

```bash
# 1. Cloner le dépôt
git clone https://github.com/fadelilyas01/AgoraExam.git
cd AgoraExam

# 2. Lancer le service avec Docker Compose
docker compose up -d --build

# 3. Vérifier l'état de santé du conteneur
docker compose ps
curl -I http://localhost:8080/healthz
```

---

## 3. Option 3 : Déploiement Haute Disponibilité Kubernetes (K8s)

Pour les infrastructures campus à forte charge (plusieurs milliers d'étudiants simultanés).

* **Manifeste :** [`k8s/deployment.yaml`](./k8s/deployment.yaml)
* **Conformité Pod Security Standard (PSS) :** Niveau `restricted` :
  - `allowPrivilegeEscalation: false`
  - `readOnlyRootFilesystem: true`
  - `drop: ["ALL"]`
  - Profil Seccomp `RuntimeDefault`
* **Stratégie Zero-Downtime :** RollingUpdate avec `maxSurge: 1` et `maxUnavailable: 0`.
* **3 Sondes de santé configurées :** `startupProbe`, `readinessProbe` et `livenessProbe`.
* **Isolation réseau :** `NetworkPolicy` bloquant tous les flux sortants inutiles sauf DNS.

```bash
# Application du manifeste Kubernetes
kubectl apply -f k8s/deployment.yaml

# Vérification du déploiement progressif
kubectl rollout status deployment/agoraexam
```

---

## 4. Pipeline DevSecOps & Intégration Continue (GitHub Actions)

Tout commit ou Pull Request est audité automatiquement par le pipeline [`.github/workflows/devsecops-ci.yml`](./.github/workflows/devsecops-ci.yml) :

1. **Détection de fuite de secrets :** Scan automatique Gitleaks sur l'ensemble de l'arborescence.
2. **Audit SCA de dépendances :** `npm audit --audit-level=high` garantissant 0 CVE.
3. **Analyse statique frontend :** `tsc --noEmit` et compilation de production Vite.
4. **Analyse statique Rust :** `cargo check` et `cargo clippy -- -D warnings` sans avertissement.
5. **Vérification de l'image Docker :** Test de build multi-stage automatisé.

---

## 5. Déploiement Binaire Client & DSI Campus (Windows, Mac, Linux)

Pour équiper les parcs informatiques universitaires :

### Déploiement Silencieux Windows (Intune / SCCM / GPO) :
```powershell
# Installation silencieuse MSI sur l'ensemble du parc machine
msiexec /i AgoraExam.msi /qn /norestart

# Ou via l'installateur NSIS
AgoraExam-Setup.exe /S
```

### Déploiement macOS (Jamf Pro / Munki) :
```bash
# Installation silencieuse PKG / DMG dans /Applications
sudo hdiutil attach AgoraExam-aarch64.dmg
sudo cp -R /Volumes/AgoraExam/AgoraExam.app /Applications/
sudo hdiutil detach /Volumes/AgoraExam
sudo xattr -cr /Applications/AgoraExam.app
```

### Déploiement Linux Universitaire (APT / Ansible) :
```bash
# Paquet Debian officiel
sudo dpkg -i AgoraExam.deb || sudo apt-get install -f -y
```

### Vérification de l'Intégrité Cryptographique :
Chaque binaire publié sur GitHub Releases est scellé par une empreinte SHA-256 certifiée :
```bash
sha256sum -c SHA256SUMS.txt
```

