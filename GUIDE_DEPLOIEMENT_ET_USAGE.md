# Guide de Déploiement et d'Administration — AgoraExam

Procédures d'installation, de configuration et d'exploitation pour étudiants, enseignants et administrateurs d'infrastructure (DSI).

---

## Sommaire

1. [Recommandations pour les étudiants](#1-recommandations-pour-les-étudiants)
2. [Intégration et configuration pour les enseignants (Moodle)](#2-intégration-et-configuration-pour-les-enseignants-moodle)
3. [Déploiement pour les administrateurs systèmes et réseaux](#3-déploiement-pour-les-administrateurs-systèmes-et-réseaux)

---

## 1. Recommandations pour les étudiants

### A. Téléchargement et installation

- **Windows 10 / 11 :**
  - Télécharger l'installateur `AgoraExam-Setup.exe`.
  - Exécuter le fichier d'installation (installation locale dans `%LocalAppData%`, ne requérant pas de privilèges administrateur).
- **macOS :**
  - Ouvrir l'image disque `AgoraExam.dmg` et déplacer l'application dans le dossier `/Applications`.
  - Lors du premier lancement, autoriser l'accès à la caméra et au microphone dans les réglages système de macOS (*Confidentialité et sécurité*).
- **Linux :**
  - Télécharger le paquet `AgoraExam.AppImage`, attribuer les droits d'exécution (`chmod +x AgoraExam.AppImage`) et exécuter le binaire.

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
</div>
```

5. **Contrôle d'accès :**
   - Les étudiants se connectant depuis un navigateur classique ne possèdent pas la clé et ne peuvent pas démarrer la tentative.
   - Les candidats utilisant AgoraExam bénéficient de l'injection automatique de la clé et du basculement en mode Kiosk verrouillé.

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
