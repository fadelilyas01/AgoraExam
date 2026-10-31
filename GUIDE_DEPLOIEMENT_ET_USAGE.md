# Guide de Déploiement et d'Administration — AgoraExam

Procédures d'installation, de configuration et d'exploitation pour étudiants, enseignants et administrateurs d'infrastructure (DSI).

---

## Sommaire

1. [Recommandations pour les étudiants](#1-recommandations-pour-les-étudiants)
2. [Intégration et configuration pour les enseignants (Moodle)](#2-intégration-et-configuration-pour-les-enseignants-moodle)
3. [Déploiement pour les administrateurs systèmes et réseaux](#3-déploiement-pour-les-administrateurs-systèmes-et-réseaux)
4. [Hébergement du portail web (Vercel, Netlify, GitHub Pages)](#4-hébergement-du-portail-web-vercel-netlify-github-pages)

---

## 1. Recommandations pour les étudiants

### A. Téléchargement et installation

Téléchargez le binaire officiel correspondant à votre ordinateur :

| Système d'exploitation | Format | Lien de téléchargement direct | Instructions |
| :--- | :---: | :---: | :--- |
| **Windows (10/11)** | `.exe` | [Télécharger AgoraExam.exe](https://github.com/fadelilyas01/AgoraExam/releases/latest/download/AgoraExam.exe) | Exécuter directement (installation utilisateur sans mot de passe admin). |
| **macOS (Apple Silicon M1/M2/M3/M4)** | `.dmg` | [Télécharger AgoraExam-aarch64.dmg](https://github.com/fadelilyas01/AgoraExam/releases/latest/download/AgoraExam-aarch64.dmg) | Ouvrir le `.dmg` et glisser l'icône dans `/Applications`. |
| **macOS (Processeur Intel)** | `.dmg` | [Télécharger AgoraExam-x64.dmg](https://github.com/fadelilyas01/AgoraExam/releases/latest/download/AgoraExam-x64.dmg) | Ouvrir le `.dmg` et glisser l'icône dans `/Applications`. |
| **Linux (Ubuntu, Debian, Fedora)** | `.AppImage` | [Télécharger AgoraExam.AppImage](https://github.com/fadelilyas01/AgoraExam/releases/latest/download/AgoraExam.AppImage) | Rendre exécutable (`chmod +x`) et lancer. |

> [!NOTE]
> Sur macOS, lors du premier démarrage, autorisez l'accès à la caméra et au microphone lorsque le système vous le demande (*Réglages Système > Confidentialité et sécurité*).

### B. Vérification préalable (Test à froid)

Il est recommandé de tester l'installation 24 heures avant l'examen officiel :

1. Fermer l'ensemble des applications d'arrière-plan (outils de communication, de capture ou navigateurs tiers).
2. Débrancher tout écran secondaire (HDMI, DisplayPort, AirPlay).
3. Lancer AgoraExam et valider le diagnostic matériel (Webcam, Microphone, Moniteur unique).
4. La validation du diagnostic confirme la compatibilité du poste de travail.

---

## 2. Intégration et configuration pour les enseignants (Moodle)

### Méthode par clé de restriction (Sans plugin tiers)

1. Dans le cours Moodle, ouvrir les paramètres de l'activité **Test**.
2. Définir les critères d'évaluation habituels (barème, durée de l'épreuve).
3. Dans la section **Restrictions supplémentaires sur les tentatives** :
   - Renseigner une clé d'accès sécurisée (exemple : `Session_SecureKey_2026`).
   - Ne pas communiquer cette clé aux étudiants.
4. Dans le champ de description du test sur Moodle, insérer le lien d'appel au protocole applicatif :

```html
<div style="padding: 14px; border: 1px solid #334155; border-radius: 6px; background: #0f172a; color: #f8fafc; text-align: center;">
  <p style="margin-bottom: 10px; font-size: 14px;">Cet examen nécessite l'environnement sécurisé AgoraExam.</p>
  <a href="agoraexam://launch?quizid=142&attempt=new" 
     style="background: #0ea5e9; color: #ffffff; padding: 8px 16px; border-radius: 4px; text-decoration: none; font-weight: 600; display: inline-block;">
    Ouvrir l'épreuve dans AgoraExam
  </a>
  <p style="margin-top: 10px; font-size: 12px; color: #94a3b8;">
    Pas encore installé ? <a href="https://github.com/fadelilyas01/AgoraExam/releases/latest/download/AgoraExam.exe" style="color: #38bdf8;">Télécharger le logiciel AgoraExam</a>
  </p>
</div>
```

5. **Contrôle d'accès :**
   - Les étudiants se connectant depuis un navigateur classique ne possèdent pas la clé et ne peuvent pas démarrer la tentative.
   - Les candidats utilisant AgoraExam bénéficient de l'injection automatique de la clé et du basculement en mode Kiosk verrouillé.

### Politiques de surveillance configurables & Protocole Human-in-the-Loop

AgoraExam applique le principe de **l'humain dans la boucle (Human-in-the-Loop)** recommandé par le cadre européen de l'IA (AI Act) et les comités d'éthique universitaires :

1. **Aucune déconnexion arbitraire par l'IA :** Les incidents détectés (disparition du visage > 4s, présence de tiers) sont consignés dans le dossier numérique du candidat avec photos chiffrées et horodatées.
2. **Alerte surveillant en temps réel :** Au 3ème avertissement (Mode Hybride par défaut), une notification d'urgence est transmise au surveillant ou enseignant. **Seul le surveillant humain a l'autorité de valider une exclusion** ou d'autoriser l'étudiant à poursuivre.
3. **Modes adaptables selon la politique de l'établissement :**
   - **Mode Hybride (Défaut)** : 3 avertissements avec consignation au dossier -> Alerte directe du surveillant humain.
   - **Mode Audit Trail (Pédagogique)** : Enregistrement continu des anomalies pour revue a posteriori sans interruption de l'étudiant.
   - **Mode Strict (Concours)** : Scellement automatique via l'API Moodle (`finishattempt=1`) réservé aux épreuves certificatives à tolérance zéro.

### Exploitation des éléments de preuve post-examen

- Toute infraction confirmée (départ prolongé de plus de 4 secondes ou présence de plusieurs personnes) génère un cliché photographique horodaté stocké localement dans `%AppData%/AgoraExam/evidence/[attempt_id]/`.
- Les fichiers archivés disposent d'un identifiant de tentative et d'une empreinte d'horodatage utilisable lors des commissions d'examen en cas de litige.

---

## 3. Déploiement pour les administrateurs systèmes et réseaux

### A. Déploiement centralisé en salle d'examen (GPO / Intune)

Pour installer l'application sur un parc de machines universitaires :

```powershell
# Déploiement silencieux par machine via MSI (Windows)
msiexec.exe /i "\\serveur-partage\AgoraExam\AgoraExam.msi" /qn /norestart ALLUSERS=1
```

### B. Signature numérique du binaire

Afin d'éviter les avertissements de sécurité des systèmes d'exploitation (Windows Defender SmartScreen et Apple Gatekeeper) :

1. Utiliser un certificat de signature de code standard (OV ou EV émis par une autorité reconnue).
2. Spécifier les clés de signature dans les variables d'environnement de la chaîne de compilation Tauri (`TAURI_SIGNING_PRIVATE_KEY`).
3. Les binaires signés s'exécutent de façon transparente sur les postes institutionnels et personnels.

---

## 4. Hébergement du portail web (Vercel, Netlify, GitHub Pages)

Le site officiel et la documentation peuvent être hébergés gratuitement avec SSL automatique et CDN mondial sur les plateformes suivantes :

### Option A : Déploiement sur Vercel (Recommandé)
1. Créer un compte sur [vercel.com](https://vercel.com) (connexion directe avec GitHub).
2. Cliquer sur **« Add New... » > « Project »**.
3. Sélectionner le référentiel **`fadelilyas01/AgoraExam`**.
4. Le fichier [`vercel.json`](vercel.json) est automatiquement détecté (Framework: Vite, Répertoire: `dist`).
5. Cliquer sur **« Deploy »** : le portail est en ligne sous une adresse sécurisée HTTPS (`agoraexam.vercel.app`).
6. Tout nouveau commit poussé sur la branche `main` déclenche un redéploiement automatique sans interruption de service.

### Option B : Déploiement sur Netlify
1. Se connecter sur [app.netlify.com](https://app.netlify.com) avec GitHub.
2. Cliquer sur **« Add new site » > « Import an existing project » > « GitHub »**.
3. Choisir le dépôt **`fadelilyas01/AgoraExam`**.
4. Le fichier [`netlify.toml`](netlify.toml) configure automatiquement les règles de build et les redirections SPA.
5. Cliquer sur **« Deploy AgoraExam »**.

### Option C : Ligne de commande locale (CLI)
```bash
# Déploiement Vercel direct :
npx vercel --prod

# Déploiement Netlify direct :
npx netlify deploy --prod --dir=dist
```
