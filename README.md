# AgoraExam

Navigateur d'examen sécurisé et télésurveillance pour plateformes Moodle.  
Client de bureau Kiosk open-source avec inférence de vision locale (Edge AI) et conformité RGPD.

---

## Sommaire

- [Présentation](#présentation)
- [Fonctionnalités principales](#fonctionnalités-principales)
- [Téléchargements des binaires](#téléchargements-des-binaires)
- [Guide d'utilisation pour les étudiants](#guide-dutilisation-pour-les-étudiants)
- [Configuration pour les enseignants (Moodle)](#configuration-pour-les-enseignants-moodle)
- [Architecture technique](#architecture-technique)
- [Sécurité, confidentialité et RGPD](#sécurité-confidentialité-et-rgpd)
- [Environnement de développement et compilation](#environnement-de-développement-et-compilation)
- [Licence](#licence)

---

## Présentation

AgoraExam est une solution open-source de navigation sécurisée (*Lockdown Browser*) et de surveillance d'examen (*proctoring*) dédiée aux établissements d'enseignement supérieur utilisant Moodle.

L'application isole l'environnement de l'étudiant en mode Kiosk exclusif et vérifie la présence du candidat face à son écran grâce à des modèles de vision par ordinateur exécutés localement sur le poste de travail.

---

## Fonctionnalités principales

- **Confinement Kiosk intégral :** Fenêtre plein écran forcée sans bordure, masquage de la barre des tâches, désactivation d'Alt+Tab, Alt+F4, Cmd+Tab, touches de fonction (F1-F12), raccourcis de navigation et captures d'écran.
- **Contrôle matériel d'affichage (Anti-Dual Monitor) :** Détection via les API système du nombre d'écrans physiques connectés. L'examen est bloqué si des moniteurs secondaires (HDMI, DisplayPort, AirPlay, Miracast) sont détectés.
- **Inférence visuelle 100% locale :** Analyse des flux vidéo par MediaPipe Face Landmarker directement dans le runtime client. Aucun flux vidéo n'est envoyé ni enregistré sur des serveurs distants.
- **Gestion des infractions et seuil de tolérance (Règle des 3 avertissements) :**
  - Un filtre temporel de 4 secondes consécutives évite les faux positifs liés aux mouvements naturels de tête.
  - Avertissements 1 et 2 : notification bloquante avec rappel des règles et journalisation locale.
  - Avertissement 3 (Kill Switch) : clôture et soumission immédiate de la tentative sur Moodle via l'API Web Services (`mod_quiz_process_attempt`), scellement de la session et fermeture de l'application.
- **Traçabilité et preuves horodatées :** Enregistrement local d'une capture visuelle horodatée lors de chaque infraction pour servir de pièce justificative en cas de recours ou de commission disciplinaire.

---

## Téléchargements des binaires

Les paquets d'installation prêts à l'emploi sont disponibles pour les environnements de bureau pris en charge :

| Plateforme | Format | Lien de téléchargement | Prérequis système |
| :--- | :---: | :---: | :--- |
| **Windows** | `.exe` / `.msi` | [AgoraExam-Setup.exe](https://github.com/votre-orga/AgoraExam/releases/latest/download/AgoraExam-Setup.exe) | Windows 10 / 11 (x64) |
| **macOS (Apple Silicon)** | `.dmg` | [AgoraExam-aarch64.dmg](https://github.com/votre-orga/AgoraExam/releases/latest/download/AgoraExam-aarch64.dmg) | macOS 11.0 (Big Sur) ou supérieur |
| **macOS (Intel)** | `.dmg` | [AgoraExam-x64.dmg](https://github.com/votre-orga/AgoraExam/releases/latest/download/AgoraExam-x64.dmg) | macOS 10.15 (Catalina) ou supérieur |
| **Linux** | `.AppImage` / `.deb` | [AgoraExam.AppImage](https://github.com/votre-orga/AgoraExam/releases/latest/download/AgoraExam.AppImage) | Noyau Linux 5.4+, GLIBC 2.31+ |

---

## Guide d'utilisation pour les étudiants

1. **Préparation du poste :**
   - Télécharger et installer l'exécutable adapté à votre système.
   - Fermer l'ensemble des logiciels de messagerie, d'enregistrement ou de partage d'écran (Discord, Teams, Zoom, WhatsApp, Slack, OBS).
   - Débrancher tout écran externe. Un seul écran doit être actif.
2. **Phase de pré-vérification (Pre-Flight Check) :**
   - Lancer l'application AgoraExam.
   - Autoriser l'accès à la webcam et au microphone lors de la demande.
   - Ajuster la position de la caméra pour que le visage soit clairement visible et centré.
   - Valider la charte éthique et la détection d'écran unique.
3. **Déroulement de l'épreuve :**
   - Cliquer sur « Démarrer l'Examen Sécurisé ». L'écran se verrouille en mode exclusif.
   - Répondre aux questions sur l'interface Moodle intégrée.
   - Conserver le visage face à la caméra. Une absence supérieure à 4 secondes ou la présence d'une tierce personne déclenche un avertissement d'infraction.
   - À l'issue du test, cliquer sur le bouton de fin d'épreuve pour soumettre définitivement la copie et déverrouiller la machine.

---

## Configuration pour les enseignants (Moodle)

L'obligation d'utiliser AgoraExam pour un test Moodle ne nécessite aucun composant serveur lourd :

### Méthode recommandée : Clé d'accès masquée

1. Dans les paramètres du **Test (Quiz)** sur Moodle, ouvrir la section **Restrictions supplémentaires sur les tentatives**.
2. Définir une clé d'accès robuste (exemple : `Agora_Strict_Session_2026`). **Ne pas diffuser ce mot de passe aux étudiants.**
3. Dans la description publique du test sur Moodle, insérer le lien de lancement protocolaire :
   ```html
   <p>Cet examen nécessite obligatoirement l'application AgoraExam.</p>
   <p>
     <a href="agoraexam://launch?quizid=142&attempt=new">
       Lancer l'examen dans AgoraExam
     </a>
   </p>
   ```
4. **Comportement garanti :**
   - Tout candidat ouvrant le test depuis un navigateur web standard (Chrome, Edge, Firefox, Safari) se heurte à la demande de mot de passe inconnu.
   - L'ouverture via l'application AgoraExam injecte la clé de session de manière transparente et scelle l'environnement de composition.

---

## Architecture technique

L'application repose sur un découplage strict entre le moteur système et la couche de présentation :

```text
AgoraExam/
├── src/                                  # Frontend TypeScript & React (Interface & Vision)
│   ├── components/
│   │   └── PreFlightCheck.tsx            # Contrôle matériel, flux caméra et diagnostics
│   ├── services/
│   │   └── faceDetection.ts              # Pipeline MediaPipe (Wasm) pour l'analyse visuelle
│   ├── App.tsx                           # Kiosk HUD, moniteur PiP et pièges clavier/focus
│   └── index.css                         # Design tokens sémantiques conformes aux règles UI
│
└── src-tauri/                            # Backend Système natif en Rust (Tauri v2)
    ├── Cargo.toml                        # Dépendances (reqwest rustls, zeroize, tokio, tracing)
    ├── tauri.conf.json                   # Confinement Kiosk, plein écran, permissions OS
    ├── Info.plist                        # Déclarations des usages caméra et microphone macOS
    └── src/
        ├── lib.rs                        # Commandes natives, watchdog de focus, API Moodle
        └── main.rs                       # Point d'entrée binaire et initialisation des traces
```

---

## Sécurité, confidentialité et RGPD

AgoraExam a été développé selon les principes du *Secure-by-Design* et de minimisation des données :

- **Absence de télémétrie vidéo continue :** Aucun enregistrement vidéo continu n'est opéré ni transmis vers des serveurs tiers.
- **Inférence locale en mémoire vive :** Les coordonnées faciales calculées par MediaPipe restent cantonnées à la mémoire de travail locale du client.
- **Gestion stricte des secrets en mémoire :** Les jetons d'accès API Moodle (`wstoken`) sont automatiquement écrasés en mémoire vive à leur libération via l'implémentation de la crate Rust `zeroize`.
- **Communications chiffrées :** Tout échange réseau avec l'API Moodle est réalisé en TLS 1.3 via la pile 100% Rust (`rustls`), sans recours à des bibliothèques C externes vulnérables.

---

## Environnement de développement et compilation

### Prérequis

- [Node.js](https://nodejs.org/) (version 20.x ou supérieure)
- [Rust](https://rustup.rs/) (version 1.80.x ou supérieure)
- Sous Windows : Outils de compilation C++ MSVC (Visual Studio Build Tools) et Windows 10/11 SDK.
- Sous macOS : Xcode Command Line Tools (`xcode-select --install`).

### Installation et exécution en développement

```bash
# 1. Cloner le dépôt
git clone https://github.com/votre-orga/AgoraExam.git
cd AgoraExam

# 2. Installer les dépendances du frontend
npm install

# 3. Lancer l'application de bureau native en mode développement
npm run tauri dev
```

### Génération des livrables de production

```bash
npm run tauri build
```

Les binaires d'installation compilés et signés sont générés dans le répertoire `src-tauri/target/release/bundle/`.

---

## Licence

Ce projet est distribué sous licence MIT. Consulter le fichier [LICENSE](LICENSE) pour les termes complets.
