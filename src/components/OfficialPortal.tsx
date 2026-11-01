
import { useState, useEffect, useRef } from "react";
import {
  Download,
  BookOpen,
  Camera,
  Lock,
  ExternalLink,
  Check,
  Copy,
  Search,
  CheckCircle2,
  ShieldCheck,
  Eye,
  Sliders,
  VideoOff,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Monitor,
  Maximize2,
  UserCheck,
  SlidersHorizontal,
} from "lucide-react";
import {
  LiveDiagnosticWidget,
  ThreeStepStudentJourney,
  PrivacyAndEthicsSection,
  InteractiveTroubleshootingFaq,
} from "./StudentOnboarding";
import {
  AgoraExamLogo,
  WindowsLogo,
  AppleLogo,
  LinuxLogo,
  MoodleLogo,
  GitHubLogo,
} from "./Logos";

interface OfficialPortalProps {
  initialTab?: "home" | "docs" | "download";
  onLaunchApp?: () => void;
}

export type DocSectionId =
  | "intro"
  | "onboarding-test"
  | "vie-privee"
  | "faq-depannage"
  | "edge-ai"
  | "telechargement"
  | "etudiant-guide"
  | "depannage-camera"
  | "regle-strikes"
  | "enseignant-guide"
  | "generateur-moodle"
  | "dsi-deploiement"
  | "dsi-securite"
  | "bac-a-sable";

interface DocItem {
  id: DocSectionId;
  title: string;
  desc: string;
  badge?: string;
}

interface DocGroup {
  group: string;
  items: DocItem[];
}

const DOC_GROUPS: DocGroup[] = [
  {
    group: "Portail Onboarding Étudiant",
    items: [
      { id: "onboarding-test", title: "Autodiagnostic Candidat", desc: "Test live caméra, micro, écran & réseau", badge: "Live Test" },
      { id: "etudiant-guide", title: "Déroulement de l'Examen", desc: "Parcours en 3 étapes : Avant, Pendant, Après" },
      { id: "vie-privee", title: "Vie Privée & Éthique", desc: "Edge AI 100% local, RGPD & Loi 25", badge: "RGPD" },
      { id: "faq-depannage", title: "Centre de Dépannage & FAQ", desc: "SmartScreen, processus système, reconnexion Wi-Fi", badge: "Aide" },
    ],
  },
  {
    group: "Bien Démarrer",
    items: [
      { id: "intro", title: "Présentation Générale", desc: "Vision & architecture du navigateur" },
      { id: "edge-ai", title: "Vision Locale & RGPD", desc: "Traitement 100% sur l'appareil sans cloud", badge: "Souverain" },
      { id: "telechargement", title: "Matrice Téléchargements", desc: "Binaires Windows, macOS & Linux" },
    ],
  },
  {
    group: "Guide Candidat Approfondi",
    items: [
      { id: "regle-strikes", title: "Human-in-the-Loop & Strikes", desc: "Tolérance 4s, Dossier Candidat & Politiques", badge: "Éthique" },
      { id: "depannage-camera", title: "Dépannage Caméra & Micro", desc: "Résolution des conflits de capteurs" },
    ],
  },
  {
    group: "Guide Enseignant",
    items: [
      { id: "enseignant-guide", title: "Configuration Moodle", desc: "Méthode par mot de passe masqué" },
      { id: "generateur-moodle", title: "Générateur Bouton Moodle", desc: "Bloc HTML prêt à coller dans le quiz", badge: "Interactif" },
    ],
  },
  {
    group: "DSI & Administrateurs",
    items: [
      { id: "dsi-deploiement", title: "Déploiement Intune & GPO", desc: "Installation silencieuse en masse" },
      { id: "dsi-securite", title: "Spécifications Cybersécurité", desc: "Watchdog Rust, Zeroize & TLS natif" },
    ],
  },
  {
    group: "Banc d'Essai",
    items: [
      { id: "bac-a-sable", title: "Testeur Caméra Web Live", desc: "Miroir de cadrage et test en direct", badge: "Live" },
    ],
  },
];

export function OfficialPortal({ initialTab = "home", onLaunchApp }: OfficialPortalProps) {
  const [activeTab, setActiveTab] = useState<"home" | "docs" | "download">(initialTab);
  const [activeDocSection, setActiveDocSection] = useState<DocSectionId>("intro");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  // Menus tiroirs mobiles
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  // Profil sélectionné sur la page d'accueil ("etudiant" | "enseignant" | "dsi")
  const [activeProfile, setActiveProfile] = useState<"etudiant" | "enseignant" | "dsi">("etudiant");
  const [mobileDocsDrawerOpen, setMobileDocsDrawerOpen] = useState<boolean>(false);

  // Détection automatique de l'OS et du support mobile de l'utilisateur
  const [detectedOs, setDetectedOs] = useState<"windows" | "mac" | "linux">("windows");
  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const ua = window.navigator.userAgent.toLowerCase();
      const mobileCheck = /iphone|ipad|ipod|android|mobile/.test(ua) || (window.innerWidth < 768 && "ontouchstart" in window);
      setIsMobileDevice(mobileCheck);

      if (ua.includes("mac") && !mobileCheck) setDetectedOs("mac");
      else if (ua.includes("linux") && !mobileCheck) setDetectedOs("linux");
      else setDetectedOs("windows");
    }
  }, []);

  // Synchronisation avec le Hash URL (#docs, #download, #home)
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash === "docs") setActiveTab("docs");
      else if (hash === "download") setActiveTab("download");
      else if (hash === "home") setActiveTab("home");
    };

    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  const changeTab = (tab: "home" | "docs" | "download") => {
    setActiveTab(tab);
    window.location.hash = `#${tab}`;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const selectDocSection = (sectionId: DocSectionId) => {
    setActiveDocSection(sectionId);
    setMobileDocsDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const getActiveDocTitle = (): string => {
    for (const grp of DOC_GROUPS) {
      const found = grp.items.find((item) => item.id === activeDocSection);
      if (found) return found.title;
    }
    return "Documentation";
  };

  // Palette de Commandes Rapide (⌘K / Ctrl+K)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState<boolean>(false);
  const [commandSearch, setCommandSearch] = useState<string>("");

  // Modal d'assistance visuelle et reconnaissance du LOGO lors du téléchargement
  const [downloadModalData, setDownloadModalData] = useState<{
    os: "windows" | "mac" | "linux";
    filename: string;
    size: string;
    sha256: string;
    instructions: string[];
    terminalCommand?: string;
  } | null>(null);

  // États interactifs du Mockup Hero (Démonstration en direct)
  const [mockupSelectedOption, setMockupSelectedOption] = useState<string>("B");
  const [mockupCamActive, setMockupCamActive] = useState<boolean>(false);
  const [mockupCamError, setMockupCamError] = useState<string | null>(null);
  const [mockupStream, setMockupStream] = useState<MediaStream | null>(null);
  const heroVideoRef = useRef<HTMLVideoElement | null>(null);

  // Raccourci clavier universel ⌘K / Ctrl+K et Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setCommandPaletteOpen(false);
        setDownloadModalData(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Déclenchement de téléchargement avec feedback visuel immédiat & reconnaissance de l'icône
  const triggerDownload = (
    os: "windows" | "mac" | "linux",
    filename: string,
    size: string,
    url: string,
    sha256: string,
    instructions: string[],
    terminalCommand?: string
  ) => {
    const a = document.createElement("a");
    a.href = url;
    a.setAttribute("download", filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setDownloadModalData({
      os,
      filename,
      size,
      sha256,
      instructions,
      terminalCommand,
    });
  };

  const toggleHeroCam = async () => {
    if (mockupCamActive) {
      if (mockupStream) {
        mockupStream.getTracks().forEach((track) => track.stop());
      }
      setMockupStream(null);
      setMockupCamActive(false);
      return;
    }

    if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMockupCamError("Webcam indisponible : le navigateur exige une connexion HTTPS ou localhost.");
      setMockupCamActive(false);
      return;
    }

    try {
      setMockupCamError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });
      setMockupStream(stream);
      setMockupCamActive(true);
    } catch (err: any) {
      console.error("Erreur caméra mockup :", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setMockupCamError("Permission refusée. Cliquez sur l'icône de cadenas/caméra dans l'URL pour autoriser.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setMockupCamError("Aucune webcam détectée sur cet appareil.");
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        setMockupCamError("Webcam occupée par un autre logiciel (Zoom, Teams, Discord).");
      } else {
        setMockupCamError(`Erreur webcam : ${err.message || err.name}`);
      }
      setMockupCamActive(false);
    }
  };

  useEffect(() => {
    return () => {
      if (mockupStream) {
        mockupStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [mockupStream]);

  // États du générateur Moodle
  const [moodleQuizId, setMoodleQuizId] = useState<string>("142");
  const [moodleUrl, setMoodleUrl] = useState<string>("https://moodle.universite.fr");
  const [examName, setExamName] = useState<string>("Algorithmique Avancée");

  // États du Bac à Sable Caméra Live
  const [sandboxStream, setSandboxStream] = useState<MediaStream | null>(null);
  const [sandboxActive, setSandboxActive] = useState<boolean>(false);
  const [sandboxError, setSandboxError] = useState<string | null>(null);
  const sandboxVideoRef = useRef<HTMLVideoElement | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const toggleSandboxCamera = async () => {
    if (sandboxActive) {
      if (sandboxStream) {
        sandboxStream.getTracks().forEach((track) => track.stop());
      }
      setSandboxStream(null);
      setSandboxActive(false);
      return;
    }

    if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setSandboxError("L'accès à la webcam requiert une connexion HTTPS sécurisée ou un navigateur moderne.");
      setSandboxActive(false);
      return;
    }

    try {
      setSandboxError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });
      setSandboxStream(stream);
      setSandboxActive(true);
    } catch (err: any) {
      console.error("Erreur webcam sandbox :", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setSandboxError("Permission refusée. Veuillez autoriser la webcam dans la barre d'adresse de votre navigateur.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setSandboxError("Aucune webcam détectée sur votre ordinateur.");
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        setSandboxError("La webcam est actuellement verrouillée par un autre logiciel (Teams, Zoom, etc.).");
      } else {
        setSandboxError(`Erreur d'accès à la caméra : ${err.message || err.name}`);
      }
      setSandboxActive(false);
    }
  };

  useEffect(() => {
    return () => {
      if (sandboxStream) {
        sandboxStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [sandboxStream]);

  // Fonction d'échappement sécurisée anti-XSS
  const escapeHtml = (text: string): string => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const safeExamName = escapeHtml(examName);
  const safeQuizId = encodeURIComponent(moodleQuizId.trim());
  const safeMoodleUrl = encodeURIComponent(moodleUrl.trim());

  const generatedMoodleHtml = `<!-- Bloc AgoraExam officiel pour description de quiz Moodle -->
<div style="background:#09090b; border:1px solid #27272a; border-radius:12px; padding:24px; text-align:center; max-width:560px; margin:20px auto; font-family:'Inter',system-ui,sans-serif; color:#f4f4f5;">
  <div style="display:inline-flex; align-items:center; gap:8px; margin-bottom:12px;">
    <span style="background:#10b981; width:10px; height:10px; border-radius:50%; display:inline-block;"></span>
    <span style="font-size:13px; text-transform:uppercase; letter-spacing:0.06em; color:#10b981; font-weight:700;">Épreuve Officielle Sécurisée</span>
  </div>
  <h3 style="margin:0 0 10px 0; font-size:18px; font-weight:700; color:#ffffff;">${safeExamName}</h3>
  <p style="font-size:14px; color:#a1a1aa; margin:0 0 18px 0; line-height:1.6;">
    Cet examen exige l'utilisation d'<strong>AgoraExam</strong>. Débranchez tout écran externe et fermez toute application tierce avant d'ouvrir le test.
  </p>
  <a href="agoraexam://launch?quizid=${safeQuizId}&host=${safeMoodleUrl}" 
     style="display:inline-block; background:#10b981; color:#09090b; font-weight:700; font-size:14px; padding:12px 26px; border-radius:8px; text-decoration:none; box-shadow:0 4px 12px rgba(16,185,129,0.25);">
    Lancer l'Épreuve dans AgoraExam
  </a>
</div>`;

  const ALL_COMMANDS = [
    {
      category: "Téléchargements Officiels",
      items: [
        {
          id: "dl-win",
          title: "Télécharger pour Windows (.exe)",
          desc: "Binaire autonome 20.7 Mo • Sans droits administrateur",
          badge: "Recommandé",
          action: () => {
            changeTab("download");
            triggerDownload(
              "windows",
              "AgoraExam-Setup.exe",
              "20.7 Mo",
              "https://github.com/fadelilyas01/AgoraExam/releases/latest/download/AgoraExam-Setup.exe",
              "a8f9c2e0b571d849a64e101fbb9c24018274d8e57e1b6f00192a837c568912ef",
              [
                "Ouvrez votre dossier Téléchargements.",
                "Repérez l'icône AgoraExam verte sur le fichier AgoraExam-Setup.exe.",
                "Double-cliquez pour installer et composer sans mot de passe admin."
              ]
            );
          },
        },
        {
          id: "dl-mac-arm",
          title: "Télécharger pour macOS (Apple Silicon)",
          desc: "Application pour Mac avec puce Apple Silicon (M1, M2, M3, M4)",
          badge: "ARM64",
          action: () => {
            changeTab("download");
            triggerDownload(
              "mac",
              "AgoraExam-aarch64.dmg",
              "4.9 Mo",
              "https://github.com/fadelilyas01/AgoraExam/releases/latest/download/AgoraExam-aarch64.dmg",
              "8c12a7bf9d6482310f54e198b10e3d5a76902cd81347895e4b6c2018ea349120",
              [
                "Ouvrez le fichier AgoraExam-aarch64.dmg téléchargé.",
                "Glissez l'icône AgoraExam dans votre dossier Applications.",
                "Si Gatekeeper affiche un avertissement au 1er lancement : Clic droit > Ouvrir ou exécutez la commande ci-dessous."
              ],
              "xattr -cr /Applications/AgoraExam.app"
            );
          },
        },
        {
          id: "dl-linux",
          title: "Télécharger pour Linux (AppImage)",
          desc: "Binaire autonome universel pour Ubuntu, Debian, Fedora",
          badge: "Linux",
          action: () => {
            changeTab("download");
            triggerDownload(
              "linux",
              "AgoraExam.AppImage",
              "84 Mo",
              "https://github.com/fadelilyas01/AgoraExam/releases/latest/download/AgoraExam.AppImage",
              "3fa901bc74e92a865f1234098ebc12004589d71e23a490f89b6c0192a8492044",
              [
                "Téléchargez AgoraExam.AppImage dans votre dossier de travail.",
                "Rendez le fichier exécutable via votre gestionnaire de fichiers ou terminal.",
                "Lancez l'application."
              ],
              "chmod +x AgoraExam.AppImage && ./AgoraExam.AppImage"
            );
          },
        },
      ],
    },
    {
      category: "Mode Web & Bac à Sable",
      items: [
        {
          id: "cmd-web-kiosk",
          title: "Lancer le Mode Web Kiosk",
          desc: "Passer l'épreuve dans le navigateur sans installation",
          badge: "Universel",
          action: () => {
            if (onLaunchApp) onLaunchApp();
          },
        },
        {
          id: "cmd-cam-sandbox",
          title: "Tester ma Caméra en Direct",
          desc: "Mire optique et diagnostic des capteurs vidéo/micro",
          badge: "Live",
          action: () => {
            changeTab("docs");
            selectDocSection("bac-a-sable");
          },
        },
      ],
    },
    {
      category: "Guides Pédagogiques & Sécurité",
      items: [
        {
          id: "cmd-doc-intro",
          title: "Architecture & Spécifications Générales",
          desc: "Vision souveraine et confinement matériel",
          action: () => {
            changeTab("docs");
            selectDocSection("intro");
          },
        },
        {
          id: "cmd-doc-strikes",
          title: "Règle des 3 Strikes & Human-in-the-Loop",
          desc: "Tolérance active 4s, Dossier Candidat & Arbitrage Humain",
          badge: "Éthique",
          action: () => {
            changeTab("docs");
            selectDocSection("regle-strikes");
          },
        },
        {
          id: "cmd-doc-moodle",
          title: "Générateur de Bouton Moodle Enseignant",
          desc: "Générer le bloc HTML sécurisé à coller dans le test",
          badge: "Enseignant",
          action: () => {
            changeTab("docs");
            selectDocSection("generateur-moodle");
          },
        },
        {
          id: "cmd-doc-dsi",
          title: "Déploiement DSI (Intune, GPO & MSI)",
          desc: "Installation silencieuse sur les postes universitaires",
          badge: "DSI",
          action: () => {
            changeTab("docs");
            selectDocSection("dsi-deploiement");
          },
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen w-full bg-zinc-950 text-zinc-100 font-sans antialiased selection:bg-emerald-500/20 selection:text-emerald-300 relative overflow-x-hidden">
      {/* Halo d'ambiance supérieur (Linear / Vercel style) */}
      <div
        className="pointer-events-none absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
        aria-hidden="true"
      >
        <div
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-emerald-500/20 to-teal-400/10 opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
        />
      </div>

      {/* ========================================================================= */}
      {/* 1. BARRE DE NAVIGATION PRINCIPALE (HEADER RESPONSIVE & SAFE AREA IOS)      */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur-md pt-[env(safe-area-inset-top,0px)] transition-all">
        <div className="flex h-16 w-full items-center justify-between px-3.5 sm:px-6 lg:px-12">
          {/* Logo Brand Officiel */}
          <div className="flex items-center gap-3 sm:gap-6 lg:gap-8 min-w-0">
            <button
              onClick={() => changeTab("home")}
              className="flex items-center gap-2.5 sm:gap-3 text-left group focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-xl min-w-0"
              aria-label="Retour à l'accueil AgoraExam"
            >
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 group-hover:border-emerald-500/50 transition-colors shadow-sm shrink-0">
                <AgoraExamLogo size={24} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm sm:text-base font-bold tracking-tight text-zinc-100 truncate">AgoraExam</span>
                  <span className="hidden min-[440px]:inline-flex rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-mono font-semibold text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                    Open-Source
                  </span>
                </div>
                <p className="text-xs text-zinc-400 hidden sm:block truncate">Navigateur d'Examen Sécurisé Moodle</p>
              </div>
            </button>

            {/* Navigation Desktop */}
            <nav className="hidden md:flex items-center gap-1.5" aria-label="Navigation principale">
              <button
                onClick={() => changeTab("home")}
                className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                  activeTab === "home"
                    ? "bg-zinc-800 text-zinc-100 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                }`}
              >
                Accueil
              </button>
              <button
                onClick={() => changeTab("download")}
                className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                  activeTab === "download"
                    ? "bg-zinc-800 text-zinc-100 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                }`}
              >
                Télécharger
              </button>
              <button
                onClick={() => changeTab("docs")}
                className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                  activeTab === "docs"
                    ? "bg-zinc-800 text-zinc-100 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                }`}
              >
                Documentation
              </button>
            </nav>
          </div>

          {/* Actions Droite Desktop */}
          <div className="hidden sm:flex items-center gap-3">
            {/* Bouton Palette de Commandes ⌘K */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-400 hover:border-zinc-700 hover:text-zinc-200 transition-colors"
              aria-label="Recherche rapide"
            >
              <Search size={13} className="text-zinc-500" />
              <span>Rechercher...</span>
              <kbd className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 border border-zinc-700">⌘K</kbd>
            </button>

            <a
              href="https://github.com/fadelilyas01/AgoraExam"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/80 px-3.5 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <GitHubLogo size={16} />
              <span>GitHub</span>
              <ExternalLink size={13} className="text-zinc-500" />
            </a>

            {onLaunchApp && (
              <button
                onClick={onLaunchApp}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700 hover:text-white transition-colors"
              >
                <span>Ouvrir l'App Kiosk</span>
              </button>
            )}

            <button
              onClick={() => changeTab("download")}
              className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 transition-all shadow-md shadow-emerald-500/10 active:scale-[0.98]"
            >
              <Download size={16} />
              <span>Télécharger</span>
            </button>
          </div>

          {/* Boutons Mobile (< sm & iPhone 16 viewport) */}
          <div className="flex sm:hidden items-center gap-1.5 shrink-0">
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 focus-visible:ring-2 focus-visible:ring-emerald-500"
              aria-label="Recherche rapide ⌘K"
            >
              <Search size={15} />
            </button>

            <button
              onClick={() => changeTab("download")}
              className="flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-emerald-400 transition-all shadow-sm active:scale-[0.98]"
              aria-label="Installer ou télécharger AgoraExam"
            >
              <Download size={13} />
              <span className="hidden min-[370px]:inline">Installer</span>
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500"
              aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu de navigation"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Tiroir Déroulant Menu Mobile avec Safe Area iOS */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-zinc-800 bg-zinc-950/98 px-4 py-4 space-y-4 backdrop-blur-xl animate-in slide-in-from-top-2 duration-150 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
            <nav className="flex flex-col gap-1.5">
              <button
                onClick={() => {
                  changeTab("home");
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                  activeTab === "home"
                    ? "bg-zinc-800 text-emerald-400"
                    : "text-zinc-300 hover:bg-zinc-900"
                }`}
              >
                <span>Accueil</span>
                <ChevronRight size={16} className="text-zinc-500" />
              </button>

              <button
                onClick={() => {
                  changeTab("download");
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                  activeTab === "download"
                    ? "bg-zinc-800 text-emerald-400"
                    : "text-zinc-300 hover:bg-zinc-900"
                }`}
              >
                <span>Télécharger AgoraExam</span>
                <ChevronRight size={16} className="text-zinc-500" />
              </button>

              <button
                onClick={() => {
                  changeTab("docs");
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                  activeTab === "docs"
                    ? "bg-zinc-800 text-emerald-400"
                    : "text-zinc-300 hover:bg-zinc-900"
                }`}
              >
                <span>Documentation & Guides</span>
                <ChevronRight size={16} className="text-zinc-500" />
              </button>
            </nav>

            <div className="pt-3 border-t border-zinc-800 flex flex-col gap-2.5">
              <a
                href="https://github.com/fadelilyas01/AgoraExam"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 py-3 text-sm font-semibold text-zinc-300 hover:text-white"
              >
                <GitHubLogo size={16} />
                <span>Code Source sur GitHub</span>
                <ExternalLink size={13} className="text-zinc-500" />
              </a>

              {onLaunchApp && (
                <button
                  onClick={() => {
                    onLaunchApp();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 py-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-700"
                >
                  <span>Ouvrir l'App Kiosk Locale</span>
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ========================================================================= */}
      {/* ONGLET 1 : PAGE D'ACCUEIL OFFICIELLE                                      */}
      {/* ========================================================================= */}
      {activeTab === "home" && (
        <div className="space-y-20 sm:space-y-28 pb-24">
          {/* Hero Section */}
          <section className="relative overflow-hidden pt-8 sm:pt-16 lg:pt-24 text-center px-4 sm:px-6 max-w-5xl mx-auto space-y-6 sm:space-y-8">
            {/* Pill Notification Institutionnelle avec balise vivante */}
            <div className="inline-flex items-center gap-2.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-medium text-emerald-300 shadow-sm backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <span>v0.1.0 Multiplateforme • Examen Sécurisé &amp; Caméra 100% Privée</span>
            </div>

            {/* Titre & Sous-titre Épurés et Rigoureux */}
            <div className="space-y-3 sm:space-y-4 max-w-3xl mx-auto">
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-zinc-100 leading-tight">
                Le Navigateur d'Examen Sécurisé pour Moodle
              </h1>
              <p className="text-sm sm:text-base lg:text-lg text-zinc-300 max-w-2xl mx-auto leading-relaxed">
                Verrouillage sécurisé de l'ordinateur et présence faciale <strong>100% sur votre ordinateur</strong>.
                Zéro flux vidéo dans le cloud. Conforme RGPD et souveraineté académique.
              </p>
            </div>

            {/* Bannière d'information spécifique aux appareils mobiles */}
            {isMobileDevice && (
              <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-950/40 p-3 sm:p-4 text-xs text-emerald-200 text-left max-w-lg mx-auto shadow-sm">
                <span className="text-base shrink-0">💻</span>
                <span>
                  <strong>Application pour ordinateurs d'examen :</strong> AgoraExam s'installe sur PC Windows, Mac ou Linux pour sécuriser vos épreuves. Vous pouvez explorer la documentation et tester vos capteurs depuis votre smartphone.
                </span>
              </div>
            )}

            {/* Call To Actions de Téléchargement & Démo Web */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1 max-w-lg mx-auto w-full">
              {isMobileDevice ? (
                <button
                  onClick={() => changeTab("download")}
                  className="w-full sm:w-auto min-h-[48px] flex items-center justify-center gap-2.5 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
                >
                  <Download size={18} />
                  <span>Voir les Versions PC &amp; Mac</span>
                </button>
              ) : detectedOs === "windows" ? (
                <button
                  onClick={() =>
                    triggerDownload(
                      "windows",
                      "AgoraExam-Setup.exe",
                      "20.7 Mo",
                      "https://github.com/fadelilyas01/AgoraExam/releases/latest/download/AgoraExam-Setup.exe",
                      "a8f9c2e0b571d849a64e101fbb9c24018274d8e57e1b6f00192a837c568912ef",
                      [
                        "Ouvrez votre dossier Téléchargements.",
                        "Repérez l'icône AgoraExam verte sur le fichier AgoraExam-Setup.exe.",
                        "Double-cliquez pour installer et composer sans mot de passe admin."
                      ]
                    )
                  }
                  className="w-full sm:w-auto min-h-[46px] flex items-center justify-center gap-2.5 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
                >
                  <WindowsLogo size={18} />
                  <span>Télécharger pour Windows (.exe)</span>
                </button>
              ) : detectedOs === "mac" ? (
                <button
                  onClick={() =>
                    triggerDownload(
                      "mac",
                      "AgoraExam-aarch64.dmg",
                      "4.9 Mo",
                      "https://github.com/fadelilyas01/AgoraExam/releases/latest/download/AgoraExam-aarch64.dmg",
                      "8c12a7bf9d6482310f54e198b10e3d5a76902cd81347895e4b6c2018ea349120",
                      [
                        "Ouvrez le fichier AgoraExam-aarch64.dmg téléchargé.",
                        "Glissez l'icône AgoraExam dans votre dossier Applications.",
                        "Si Gatekeeper affiche un avertissement au 1er lancement : Clic droit > Ouvrir ou tapez xattr -cr dans le Terminal."
                      ],
                      "xattr -cr /Applications/AgoraExam.app"
                    )
                  }
                  className="w-full sm:w-auto min-h-[46px] flex items-center justify-center gap-2.5 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
                >
                  <AppleLogo size={18} />
                  <span>Télécharger pour macOS (.dmg)</span>
                </button>
              ) : (
                <button
                  onClick={() =>
                    triggerDownload(
                      "linux",
                      "AgoraExam.AppImage",
                      "84 Mo",
                      "https://github.com/fadelilyas01/AgoraExam/releases/latest/download/AgoraExam.AppImage",
                      "3fa901bc74e92a865f1234098ebc12004589d71e23a490f89b6c0192a8492044",
                      [
                        "Téléchargez AgoraExam.AppImage dans votre dossier de travail.",
                        "Rendez le fichier exécutable via votre gestionnaire de fichiers ou terminal.",
                        "Lancez l'application."
                      ],
                      "chmod +x AgoraExam.AppImage && ./AgoraExam.AppImage"
                    )
                  }
                  className="w-full sm:w-auto min-h-[46px] flex items-center justify-center gap-2.5 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
                >
                  <LinuxLogo size={18} />
                  <span>Télécharger pour Linux (.AppImage)</span>
                </button>
              )}

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {onLaunchApp && (
                  <button
                    onClick={onLaunchApp}
                    className="flex-1 sm:flex-initial min-h-[48px] flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-xs sm:text-sm font-semibold text-zinc-200 hover:bg-zinc-800 transition-colors"
                  >
                    <Maximize2 size={15} className="text-emerald-400" />
                    <span>Tester l'Examen Démo</span>
                  </button>
                )}

                <button
                  onClick={() => changeTab("docs")}
                  className="flex-1 sm:flex-initial min-h-[48px] flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-xs sm:text-sm font-semibold text-zinc-300 hover:bg-zinc-900 transition-colors"
                >
                  <BookOpen size={15} className="text-zinc-400" />
                  <span>Documentation</span>
                </button>
              </div>
            </div>

            {/* Micro-labels rassurants */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5 sm:gap-5 text-xs text-zinc-400 font-mono">
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <Check size={14} className="text-emerald-400 shrink-0" /> &lt; 21 Mo
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <Check size={14} className="text-emerald-400 shrink-0" /> Zéro Inscription
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <Check size={14} className="text-emerald-400 shrink-0" /> 100% Open-Source MIT
              </span>
            </div>

            {/* Mockup Interactif de l'Interface Kiosk */}
            <div className="pt-4 sm:pt-6 w-full">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-2 sm:p-3 shadow-2xl ring-1 ring-zinc-800/80 max-w-4xl mx-auto overflow-hidden">
                <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-2.5 sm:p-5 text-left space-y-3.5">
                  {/* Fausse barre de titre avec Logo Réel AgoraExam */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800/80 pb-3 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex items-center gap-1.5 mr-1 shrink-0">
                        <div className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                        <div className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                        <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                      </div>
                      <AgoraExamLogo size={18} />
                      <span className="text-xs sm:text-sm font-mono text-zinc-200 font-semibold truncate">
                        AgoraExam • Session Kiosk Verrouillée
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 shrink-0">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                      <span>Caméra Active • 100% sur l'appareil</span>
                    </div>
                  </div>

                  {/* Questionnaire Moodle simulé authentique */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
                    <div className="md:col-span-2 p-4 rounded-xl bg-zinc-950/90 border border-zinc-800/80 space-y-3">
                      <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                        <span className="flex items-center gap-1.5 truncate">
                          <BookOpen size={14} className="text-emerald-400" />
                          <span>Partiel d'Informatique • Semestre 2</span>
                        </span>
                        <span className="text-emerald-400 font-semibold whitespace-nowrap">Question 3 / 8</span>
                      </div>
                      <p className="text-xs sm:text-sm text-zinc-200 font-medium leading-relaxed">
                        Quelle structure de données garantit une complexité de recherche en temps constant <code className="text-emerald-300 font-mono">O(1)</code> en moyenne ?
                      </p>
                      
                      {/* Choix QCM interactifs */}
                      <div className="space-y-2 pt-1 text-xs sm:text-sm">
                        {[
                          { id: "A", label: "A. Arbre binaire de recherche équilibré (AVL)" },
                          { id: "B", label: "B. Table de hachage avec adressage ouvert", correct: true },
                          { id: "C", label: "C. Liste doublement chaînée triée" },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            onClick={() => setMockupSelectedOption(opt.id)}
                            className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                              mockupSelectedOption === opt.id
                                ? opt.correct
                                  ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300 font-medium shadow-sm"
                                  : "border-zinc-700 bg-zinc-800/80 text-zinc-200 font-medium"
                                : "border-zinc-800/80 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300"
                            }`}
                          >
                            <div className="flex items-start gap-2.5 min-w-0">
                              <div
                                className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                                  mockupSelectedOption === opt.id
                                    ? "border-emerald-400 bg-emerald-500/20"
                                    : "border-zinc-600"
                                }`}
                              >
                                {mockupSelectedOption === opt.id && (
                                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                )}
                              </div>
                              <span className="text-xs sm:text-sm leading-snug break-words">{opt.label}</span>
                            </div>
                            {mockupSelectedOption === opt.id && opt.correct && (
                              <span className="text-[11px] font-mono text-emerald-400 shrink-0 hidden sm:inline">
                                ✓ Réponse enregistrée automatiquement
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-zinc-950/90 border border-zinc-800/80 flex flex-col justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-zinc-200">
                          <div className="flex items-center gap-2">
                            <Camera size={14} className="text-emerald-400" />
                            <span>Vérification Présence</span>
                          </div>
                          <button
                            onClick={toggleHeroCam}
                            className="text-[10px] font-mono text-emerald-400 hover:underline"
                          >
                            {mockupCamActive ? "Arrêter flux" : "Tester ma caméra"}
                          </button>
                        </div>
                        <div className="relative aspect-video w-full rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center">
                          {mockupCamError ? (
                            <div className="text-center p-2 space-y-1">
                              <span className="text-[10px] text-rose-400 font-mono block">
                                ⚠ {mockupCamError}
                              </span>
                              <button
                                onClick={() => setMockupCamError(null)}
                                className="text-[10px] font-semibold text-zinc-400 hover:text-zinc-200 underline"
                              >
                                Fermer l'alerte
                              </button>
                            </div>
                          ) : mockupCamActive ? (
                            <>
                              <video
                                ref={(el) => {
                                  heroVideoRef.current = el;
                                  if (el && mockupStream && el.srcObject !== mockupStream) {
                                    el.srcObject = mockupStream;
                                    el.play().catch((err) => console.warn("Lecture mockup :", err));
                                  }
                                }}
                                autoPlay
                                playsInline
                                muted
                                className="h-full w-full object-cover -scale-x-100"
                              />
                              <div className="absolute inset-2 border border-emerald-500/40 rounded pointer-events-none" />
                              <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-mono text-emerald-400">
                                30 FPS • Local
                              </div>
                            </>
                          ) : (
                            <div className="text-center p-2 space-y-1">
                              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse mx-auto" />
                              <span className="text-[11px] text-zinc-300 font-mono block">Visage Centré • Conforme</span>
                              <span className="text-[9px] text-zinc-500 font-mono block">Aucune vidéo envoyée sur Internet</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1.5 pt-2 border-t border-zinc-800/80 text-xs font-mono">
                        <div className="flex items-center justify-between text-zinc-400">
                          <span>Strikes :</span>
                          <span className="text-emerald-400 font-semibold">0 / 3 (Conforme)</span>
                        </div>
                        <div className="flex items-center justify-between text-zinc-400">
                          <span>Chrono :</span>
                          <span className="text-zinc-200">44:12 restants</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Grille des 4 Fonctionnalités Clés (Simple, Punchy, Anti-Jargon) */}
          <section className="px-4 sm:px-6 max-w-5xl mx-auto space-y-8 sm:space-y-10">
            <div className="text-center space-y-2.5 max-w-2xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
                Tout ce qu'il faut pour un examen serein et équitable
              </h2>
              <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
                Une sécurité discrète qui protège l'intégrité de l'épreuve sans être intrusive.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              {/* Carte 1 */}
              <div className="interactive-card group p-5 sm:p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-emerald-400 border border-zinc-700/60 group-hover:border-emerald-500/40 group-hover:scale-105 transition-all duration-300">
                  <Lock size={18} />
                </div>
                <h3 className="text-base font-bold text-zinc-100 group-hover:text-emerald-300 transition-colors">Écran et applications verrouillés</h3>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  Plein écran forcé. Impossible de changer d'application, de copier-coller ou de tricher pendant l'examen.
                </p>
              </div>

              {/* Carte 2 */}
              <div className="interactive-card group p-5 sm:p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-emerald-400 border border-zinc-700/60 group-hover:border-emerald-500/40 group-hover:scale-105 transition-all duration-300">
                  <Monitor size={18} />
                </div>
                <h3 className="text-base font-bold text-zinc-100 group-hover:text-emerald-300 transition-colors">Un seul écran autorisé</h3>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  Détection automatique. Impossible d'utiliser un deuxième écran ou de brancher un câble HDMI.
                </p>
              </div>

              {/* Carte 3 */}
              <div className="interactive-card group p-5 sm:p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-emerald-400 border border-zinc-700/60 group-hover:border-emerald-500/40 group-hover:scale-105 transition-all duration-300">
                  <Camera size={18} />
                </div>
                <h3 className="text-base font-bold text-zinc-100 group-hover:text-emerald-300 transition-colors">Caméra 100% privée</h3>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  La présence est vérifiée directement sur votre ordinateur, sans jamais envoyer de vidéo sur Internet.
                </p>
              </div>

              {/* Carte 4 */}
              <div className="interactive-card group p-5 sm:p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-amber-400 border border-zinc-700/60 group-hover:border-amber-500/40 group-hover:scale-105 transition-all duration-300">
                  <ShieldCheck size={18} />
                </div>
                <h3 className="text-base font-bold text-zinc-100 group-hover:text-amber-300 transition-colors">Décision humaine garantie</h3>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  Aucune exclusion automatique par l'IA. Seul un enseignant ou surveillant humain peut arbitrer.
                </p>
              </div>
            </div>
          </section>

          {/* Section « Pour qui » en Onglets Interactifs */}
          <section className="px-4 sm:px-6 max-w-4xl mx-auto space-y-6 sm:space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100">Une solution pensée pour chacun</h2>
              <p className="text-sm sm:text-base text-zinc-400">
                Cliquez sur votre profil pour découvrir comment AgoraExam simplifie vos examens.
              </p>
            </div>

            {/* Onglets de profil */}
            <div className="flex justify-center">
              <div className="inline-flex rounded-2xl border border-zinc-800 bg-zinc-900/80 p-1.5 shadow-sm max-w-full overflow-x-auto">
                <button
                  onClick={() => setActiveProfile("etudiant")}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap interactive-button ${
                    activeProfile === "etudiant"
                      ? "bg-zinc-800 text-emerald-400 shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <UserCheck size={16} />
                  <span>Étudiant</span>
                </button>
                <button
                  onClick={() => setActiveProfile("enseignant")}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap interactive-button ${
                    activeProfile === "enseignant"
                      ? "bg-zinc-800 text-orange-400 shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <MoodleLogo size={16} />
                  <span>Enseignant</span>
                </button>
                <button
                  onClick={() => setActiveProfile("dsi")}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap interactive-button ${
                    activeProfile === "dsi"
                      ? "bg-zinc-800 text-purple-400 shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <ShieldCheck size={16} />
                  <span>Établissement & DSI</span>
                </button>
              </div>
            </div>

            {/* Contenu spécifique au profil actif */}
            <div key={activeProfile} className="rounded-3xl border border-zinc-800 bg-zinc-950/80 p-6 sm:p-8 shadow-xl transition-all animate-fade-in-up">
              {activeProfile === "etudiant" && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  <div className="space-y-2">
                    <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                      Espace Candidat
                    </span>
                    <h3 className="text-xl sm:text-2xl font-bold text-zinc-100">
                      Simple à installer, sans stress le jour J
                    </h3>
                    <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                      Téléchargez l'application en un clic. Pas besoin de droits d'administrateur. Vous pouvez tester votre webcam et votre micro la veille chez vous pour aborder l'examen en toute sérénité.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs sm:text-sm text-zinc-300">
                    <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center gap-2">
                      <Check size={16} className="text-emerald-400 shrink-0" />
                      <span>Zéro droit administrateur requis</span>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center gap-2">
                      <Check size={16} className="text-emerald-400 shrink-0" />
                      <span>Test caméra la veille à la maison</span>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center gap-2">
                      <Check size={16} className="text-emerald-400 shrink-0" />
                      <span>Protection contre les faux positifs</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => selectDocSection("etudiant-guide")}
                      className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      <span>Consulter le guide pratique pour les étudiants</span>
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              )}

              {activeProfile === "enseignant" && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  <div className="space-y-2">
                    <span className="text-xs font-mono font-bold text-orange-400 uppercase tracking-wider">
                      Espace Pédagogique
                    </span>
                    <h3 className="text-xl sm:text-2xl font-bold text-zinc-100">
                      Compatible avec vos quiz Moodle existants
                    </h3>
                    <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                      Protégez vos évaluations en quelques clics grâce à notre bouton prêt à copier-coller dans votre cours. Aucune installation technique complexe n'est requise sur le serveur Moodle.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs sm:text-sm text-zinc-300">
                    <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center gap-2">
                      <Check size={16} className="text-orange-400 shrink-0" />
                      <span>Zéro plugin à installer sur Moodle</span>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center gap-2">
                      <Check size={16} className="text-orange-400 shrink-0" />
                      <span>Bouton sécurisé prêt à copier-coller</span>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center gap-2">
                      <Check size={16} className="text-orange-400 shrink-0" />
                      <span>Rapports d'incident clairs pour le jury</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => selectDocSection("enseignant-guide")}
                      className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-orange-400 hover:text-orange-300 transition-colors"
                    >
                      <span>Consulter le guide enseignant et créer mon bouton</span>
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              )}

              {activeProfile === "dsi" && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  <div className="space-y-2">
                    <span className="text-xs font-mono font-bold text-purple-400 uppercase tracking-wider">
                      Espace Université & Informatique
                    </span>
                    <h3 className="text-xl sm:text-2xl font-bold text-zinc-100">
                      Déploiement simple sur tout votre parc de machines
                    </h3>
                    <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                      Équipez facilement vos salles de cours et postes d'examen. AgoraExam est 100% respectueux du RGPD car aucun flux vidéo n'est envoyé vers des serveurs externes.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs sm:text-sm text-zinc-300">
                    <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center gap-2">
                      <Check size={16} className="text-purple-400 shrink-0" />
                      <span>Installation facile en masse (PC & Mac)</span>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center gap-2">
                      <Check size={16} className="text-purple-400 shrink-0" />
                      <span>Conforme RGPD et vie privée garantie</span>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center gap-2">
                      <Check size={16} className="text-purple-400 shrink-0" />
                      <span>Application ultra-légère (&lt; 21 Mo)</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => selectDocSection("dsi-securite")}
                      className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      <span>Consulter les détails techniques et spécifications de sécurité</span>
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Bannière Call To Action Finale */}
          <section className="px-4 sm:px-6 max-w-4xl mx-auto">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-8 sm:p-12 text-center space-y-6 shadow-2xl">
              <div className="flex justify-center mb-2">
                <AgoraExamLogo size={42} />
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-zinc-100 leading-tight">
                Prêt à sécuriser vos prochains examens universitaires ?
              </h2>
              <p className="text-sm sm:text-base lg:text-lg text-zinc-300 max-w-xl mx-auto leading-relaxed">
                Téléchargez AgoraExam gratuitement dès aujourd'hui ou consultez notre documentation pour intégrer vos cours Moodle.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                <button
                  onClick={() => changeTab("download")}
                  className="w-full sm:w-auto min-h-[48px] rounded-xl bg-emerald-500 px-7 py-3.5 text-sm sm:text-base font-semibold text-zinc-950 hover:bg-emerald-400 transition-all shadow-md shadow-emerald-500/10"
                >
                  Télécharger AgoraExam
                </button>
                <button
                  onClick={() => changeTab("docs")}
                  className="w-full sm:w-auto min-h-[48px] rounded-xl border border-zinc-700 bg-zinc-800 px-7 py-3.5 text-sm sm:text-base font-semibold text-zinc-200 hover:bg-zinc-700 transition-colors"
                >
                  Lire la Documentation
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ONGLET 2 : PAGE DE TÉLÉCHARGEMENT OFFICIELLE                              */}
      {/* ========================================================================= */}
      {activeTab === "download" && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-10 sm:space-y-12 animate-in fade-in duration-200">
          <div className="text-center space-y-3 border-b border-zinc-800 pb-8 sm:pb-10">
            <span className="text-xs sm:text-sm font-mono font-semibold text-emerald-400 uppercase tracking-wider">
              Dernière Version Stable
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-zinc-100">
              Télécharger AgoraExam v0.1.0
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-zinc-300 max-w-2xl mx-auto leading-relaxed">
              Choisissez l'installateur correspondant à votre ordinateur. Tous les exécutables sont autonomes (&lt; 21 Mo) et ne requièrent aucun droit administrateur sous Windows.
            </p>
          </div>

          {/* Badge Identité Officielle du Logiciel Téléchargeable */}
          <div className="flex flex-col sm:flex-row items-center justify-between p-5 sm:p-6 rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur gap-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-zinc-950 border border-zinc-700/80 p-2.5 flex items-center justify-center shadow-lg shadow-emerald-500/10 shrink-0">
                <AgoraExamLogo size={46} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold text-zinc-100">AgoraExam</h2>
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-mono font-semibold text-emerald-400 border border-emerald-500/20">
                    v0.1.0 Officielle
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-zinc-300">
                  Logo officiel du logiciel • Repérez ce blason vert émeraude dans votre dossier <em>Téléchargements</em> ou sur votre bureau.
                </p>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] font-mono text-zinc-400 pt-0.5">
                  <span className="text-emerald-400 font-semibold">Application Autonome</span>
                  <span>•</span>
                  <span>SHA-256 Certifié</span>
                  <span>•</span>
                  <span>Licence MIT</span>
                </div>
              </div>
            </div>
            <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
              <span className="rounded-lg bg-zinc-800/80 px-3 py-1.5 text-xs font-mono text-zinc-300 border border-zinc-700">
                Statut : Stable
              </span>
            </div>
          </div>

          {/* Grille des plateformes avec vrais logos officiels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            {/* Windows */}
            <div className="p-6 sm:p-7 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4 hover:border-zinc-700 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-base sm:text-lg font-bold text-zinc-100 flex items-center gap-2.5">
                  <WindowsLogo size={22} />
                  <span>Windows 10 &amp; 11 (64-bit)</span>
                </span>
                <span className="rounded bg-emerald-500/10 px-2.5 py-0.5 text-xs font-mono font-semibold text-emerald-400 border border-emerald-500/20">
                  Recommandé
                </span>
              </div>
              <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                Application pour Windows (.exe). Double-cliquez pour lancer votre examen sans mot de passe administrateur.
              </p>
              <div className="pt-2 space-y-2">
                <button
                  onClick={() =>
                    triggerDownload(
                      "windows",
                      "AgoraExam-Setup.exe",
                      "20.7 Mo",
                      "https://github.com/fadelilyas01/AgoraExam/releases/latest/download/AgoraExam-Setup.exe",
                      "a8f9c2e0b571d849a64e101fbb9c24018274d8e57e1b6f00192a837c568912ef",
                      [
                        "Ouvrez votre dossier Téléchargements.",
                        "Repérez l'icône verte AgoraExam sur AgoraExam-Setup.exe.",
                        "Double-cliquez pour installer et composer sans mot de passe admin."
                      ]
                    )
                  }
                  className="w-full min-h-[48px] flex items-center justify-center gap-2.5 rounded-xl bg-emerald-500 py-3.5 px-3 sm:px-4 text-xs sm:text-sm md:text-base font-semibold text-zinc-950 hover:bg-emerald-400 transition-colors shadow-md shadow-emerald-500/10 active:scale-[0.98] text-center"
                >
                  <AgoraExamLogo size={18} />
                  <span>Télécharger AgoraExam-Setup.exe (20.7 Mo)</span>
                </button>
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-400">
                  <span>Téléchargement direct certifié</span>
                  <span>•</span>
                  <a
                    href="https://github.com/fadelilyas01/AgoraExam/releases/tag/v0.1.0"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:underline inline-flex items-center gap-1"
                  >
                    <span>Release GitHub v0.1.0</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
              </div>
              <div className="text-xs font-mono text-zinc-400 flex items-center justify-between pt-1">
                <span>SHA-256 : a8f9c2...7e1b</span>
                <span>Version 0.1.0</span>
              </div>
            </div>

            {/* macOS Apple Silicon */}
            <div className="p-6 sm:p-7 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4 hover:border-zinc-700 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-base sm:text-lg font-bold text-zinc-100 flex items-center gap-2.5">
                  <AppleLogo size={22} className="text-zinc-100" />
                  <span>macOS (Apple Silicon M1 à M4)</span>
                </span>
                <span className="rounded bg-zinc-800 px-2.5 py-0.5 text-xs font-mono text-zinc-300">
                  ARM64
                </span>
              </div>
              <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                Application pour Mac (Apple Silicon). Glissez simplement l'icône dans le dossier Applications.
              </p>
              <div className="pt-2">
                <button
                  onClick={() =>
                    triggerDownload(
                      "mac",
                      "AgoraExam-aarch64.dmg",
                      "4.9 Mo",
                      "https://github.com/fadelilyas01/AgoraExam/releases/latest/download/AgoraExam-aarch64.dmg",
                      "8c12a7bf9d6482310f54e198b10e3d5a76902cd81347895e4b6c2018ea349120",
                      [
                        "Ouvrez le fichier AgoraExam-aarch64.dmg téléchargé.",
                        "Glissez l'icône AgoraExam dans votre dossier Applications.",
                        "Si Gatekeeper bloque l'ouverture : Clic droit > Ouvrir ou tapez xattr -cr dans le Terminal."
                      ],
                      "xattr -cr /Applications/AgoraExam.app"
                    )
                  }
                  className="w-full min-h-[48px] flex items-center justify-center gap-2.5 rounded-xl bg-zinc-100 py-3.5 px-3 sm:px-4 text-xs sm:text-sm md:text-base font-semibold text-zinc-950 hover:bg-white transition-colors text-center"
                >
                  <AgoraExamLogo size={18} />
                  <span>Télécharger AgoraExam-aarch64.dmg (4.9 Mo)</span>
                </button>
              </div>
              <div className="text-xs font-mono text-zinc-400 flex items-center justify-between pt-1">
                <span>macOS 11.0 Big Sur minimum</span>
                <span>Version 0.1.0</span>
              </div>
            </div>

            {/* macOS Intel */}
            <div className="p-6 sm:p-7 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4 hover:border-zinc-700 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-base sm:text-lg font-bold text-zinc-100 flex items-center gap-2.5">
                  <AppleLogo size={22} className="text-zinc-400" />
                  <span>macOS (Processeurs Intel)</span>
                </span>
                <span className="rounded bg-zinc-800 px-2.5 py-0.5 text-xs font-mono text-zinc-300">
                  x86_64
                </span>
              </div>
              <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                Image disque pour ordinateurs Apple équipés de processeurs Intel Core.
              </p>
              <div className="pt-2">
                <button
                  onClick={() =>
                    triggerDownload(
                      "mac",
                      "AgoraExam-x64.dmg",
                      "13.4 Mo",
                      "https://github.com/fadelilyas01/AgoraExam/releases/latest/download/AgoraExam-x64.dmg",
                      "2de108ca78190fe3241bb690d71a54089c104e7823ab1947238914c6708b5e91",
                      [
                        "Ouvrez le fichier AgoraExam-x64.dmg téléchargé.",
                        "Glissez l'icône AgoraExam dans votre dossier Applications.",
                        "Si Gatekeeper bloque l'ouverture : Clic droit > Ouvrir ou tapez xattr -cr."
                      ],
                      "xattr -cr /Applications/AgoraExam.app"
                    )
                  }
                  className="w-full min-h-[48px] flex items-center justify-center gap-2.5 rounded-xl border border-zinc-700 bg-zinc-800 py-3.5 px-3 sm:px-4 text-xs sm:text-sm md:text-base font-semibold text-zinc-200 hover:bg-zinc-700 transition-colors text-center"
                >
                  <AgoraExamLogo size={18} />
                  <span>Télécharger AgoraExam-x64.dmg (13.4 Mo)</span>
                </button>
              </div>
              <div className="text-xs font-mono text-zinc-400 flex items-center justify-between pt-1">
                <span>macOS 10.15 Catalina minimum</span>
                <span>Version 0.1.0</span>
              </div>
            </div>

            {/* Linux */}
            <div className="p-6 sm:p-7 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4 hover:border-zinc-700 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-base sm:text-lg font-bold text-zinc-100 flex items-center gap-2.5">
                  <LinuxLogo size={22} />
                  <span>Linux (Ubuntu, Debian, Fedora)</span>
                </span>
                <span className="rounded bg-zinc-800 px-2.5 py-0.5 text-xs font-mono text-zinc-300">
                  AppImage &amp; DEB
                </span>
              </div>
              <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                Binaire autonome tout-en-un (.AppImage) ou paquet d'installation natif (.deb) pour distributions Linux académiques.
              </p>
              <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                <button
                  onClick={() =>
                    triggerDownload(
                      "linux",
                      "AgoraExam.AppImage",
                      "84 Mo",
                      "https://github.com/fadelilyas01/AgoraExam/releases/latest/download/AgoraExam.AppImage",
                      "3fa901bc74e92a865f1234098ebc12004589d71e23a490f89b6c0192a8492044",
                      [
                        "Téléchargez AgoraExam.AppImage.",
                        "Rendez le fichier exécutable via chmod +x.",
                        "Lancez l'application."
                      ],
                      "chmod +x AgoraExam.AppImage && ./AgoraExam.AppImage"
                    )
                  }
                  className="flex-1 min-h-[48px] flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 py-3.5 px-3 text-xs sm:text-sm font-semibold text-zinc-200 hover:bg-zinc-700 transition-colors text-center"
                >
                  <AgoraExamLogo size={16} />
                  <span>AgoraExam.AppImage (84 Mo)</span>
                </button>
                <button
                  onClick={() =>
                    triggerDownload(
                      "linux",
                      "AgoraExam.deb",
                      "6.3 Mo",
                      "https://github.com/fadelilyas01/AgoraExam/releases/latest/download/AgoraExam.deb",
                      "5b78091ecb412984a601289de34018ec723049b1092847a9b0c2310f84719280",
                      [
                        "Téléchargez AgoraExam.deb.",
                        "Installez via apt ou dpkg.",
                        "Lancez AgoraExam depuis le menu des applications."
                      ],
                      "sudo dpkg -i AgoraExam.deb"
                    )
                  }
                  className="flex-1 min-h-[48px] flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/80 py-3.5 px-3 text-xs sm:text-sm font-semibold text-zinc-200 hover:bg-zinc-700 transition-colors text-center"
                >
                  <AgoraExamLogo size={16} />
                  <span>Paquet Debian (.deb - 6.3 Mo)</span>
                </button>
              </div>
              <div className="text-xs font-mono text-zinc-400 flex items-center justify-between pt-1">
                <span>chmod +x puis exécuter</span>
                <span>Version 0.1.0</span>
              </div>
            </div>
          </div>

          {/* Option Web Kiosk Universelle — Zéro installation */}
          <div className="p-6 sm:p-8 rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/20 to-zinc-950 p-6 sm:p-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <h3 className="text-base sm:text-lg font-bold text-zinc-100">
                    Mode Web Kiosk Instantané (macOS, Linux & Chromebooks)
                  </h3>
                </div>
                <p className="text-sm sm:text-base text-zinc-300 max-w-2xl leading-relaxed">
                  Vous ne souhaitez pas ou ne pouvez pas installer d'application sur votre poste personnel ? Vous pouvez passer l'examen sécurisé directement dans votre navigateur moderne (Chrome, Safari, Edge, Firefox).
                </p>
              </div>
              {onLaunchApp && (
                <button
                  onClick={onLaunchApp}
                  className="shrink-0 min-h-[48px] flex items-center justify-center gap-2.5 rounded-xl bg-emerald-500 px-6 py-3.5 text-sm sm:text-base font-semibold text-zinc-950 hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
                >
                  <Maximize2 size={18} />
                  <span>Lancer l'Épreuve en Ligne</span>
                </button>
              )}
            </div>
            <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap gap-4 text-xs font-mono text-zinc-400">
              <span className="flex items-center gap-1.5"><Check size={14} className="text-emerald-400" /> Analyse faciale 100% locale</span>
              <span>•</span>
              <span className="flex items-center gap-1.5"><Check size={14} className="text-emerald-400" /> Zéro flux vidéo dans le cloud</span>
              <span>•</span>
              <span className="flex items-center gap-1.5"><Check size={14} className="text-emerald-400" /> Compatible Safari 15+, Chrome 90+, Firefox 90+</span>
            </div>
          </div>

          {/* Guide Rapide Après Téléchargement */}
          <div className="p-6 sm:p-8 rounded-2xl border border-zinc-800 bg-zinc-950/80 space-y-4">
            <h3 className="text-base sm:text-lg font-bold text-zinc-100 flex items-center gap-2.5">
              <CheckCircle2 size={18} className="text-emerald-400" />
              <span>Consignes d'installation selon votre système d'exploitation</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2">
                <span className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <WindowsLogo size={16} />
                  <span>Windows 10 / 11</span>
                </span>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                  Double-cliquez sur <strong>AgoraExam-Setup.exe</strong>. L'installation s'effectue dans votre session personnelle sans aucun droit ni mot de passe administrateur.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2">
                <span className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <AppleLogo size={16} />
                  <span>macOS (Apple Silicon & Intel)</span>
                </span>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                  Ouvrez le <strong>.dmg</strong> et glissez AgoraExam dans <em>Applications</em>. Au premier lancement, si Gatekeeper bloque l'ouverture : faites <strong>Clic droit &gt; Ouvrir</strong> ou exécutez dans le Terminal :<br />
                  <code className="text-[11px] font-mono text-emerald-300 block mt-1 bg-zinc-950 px-2 py-1 rounded">xattr -cr /Applications/AgoraExam.app</code>
                </p>
              </div>

              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2">
                <span className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <LinuxLogo size={16} />
                  <span>Linux (Ubuntu, Debian, Fedora)</span>
                </span>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                  Rendez le fichier exécutable et lancez-le directement :<br />
                  <code className="text-[11px] font-mono text-emerald-300 block mt-1 bg-zinc-950 px-2 py-1 rounded">chmod +x AgoraExam.AppImage &amp;&amp; ./AgoraExam.AppImage</code>
                  Ou via Debian : <code className="text-[11px] font-mono text-zinc-300">sudo dpkg -i AgoraExam.deb</code>.
                </p>
              </div>
            </div>

            <div className="pt-2 text-xs text-zinc-400">
              Besoin d'aide supplémentaire ? Consultez notre{" "}
              <button onClick={() => changeTab("docs")} className="text-emerald-400 underline font-semibold">
                Documentation technique complète
              </button>{" "}
              ou demandez assistance à votre équipe pédagogique.
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ONGLET 3 : PORTAIL DE DOCUMENTATION RESPONSIVE                            */}
      {/* ========================================================================= */}
      {activeTab === "docs" && (
        <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)] w-full relative">
          {/* BARRE MOBILE STICKY DE SÉLECTION DU CHAPITRE (< lg) AVEC SAFE AREA */}
          <div className="lg:hidden sticky top-[calc(4rem+env(safe-area-inset-top,0px))] z-30 flex items-center justify-between border-b border-zinc-800 bg-zinc-950/95 px-4 py-3 backdrop-blur-md">
            <div className="flex items-center gap-2 truncate pr-2">
              <BookOpen size={16} className="text-emerald-400 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-semibold text-zinc-200 truncate">
                {getActiveDocTitle()}
              </span>
            </div>

            <button
              onClick={() => setMobileDocsDrawerOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-zinc-800 transition-colors flex-shrink-0 focus-visible:ring-2 focus-visible:ring-emerald-500"
              aria-label="Ouvrir le sommaire de la documentation"
              aria-expanded={mobileDocsDrawerOpen}
            >
              <span>Sommaire (11)</span>
              <ChevronDown size={14} />
            </button>
          </div>

          {/* TIROIR MODAL SOMMAIRE MOBILE (< lg) AVEC SAFE AREA BOTTOM */}
          {mobileDocsDrawerOpen && (
            <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-sm lg:hidden animate-in fade-in duration-150">
              <div
                className="fixed inset-0"
                onClick={() => setMobileDocsDrawerOpen(false)}
              />
              <div className="relative z-10 max-h-[85vh] rounded-t-3xl border-t border-zinc-800 bg-zinc-950 p-5 sm:p-6 overflow-y-auto space-y-6 shadow-2xl pb-[max(2rem,env(safe-area-inset-bottom,0px))]">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                  <div className="flex items-center gap-2">
                    <BookOpen size={18} className="text-emerald-400" />
                    <span className="text-base font-bold text-zinc-100">Sommaire de la Documentation</span>
                  </div>
                  <button
                    onClick={() => setMobileDocsDrawerOpen(false)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Recherche rapide mobile */}
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Filtrer les chapitres..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 pl-9 pr-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-emerald-500/50 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                  />
                </div>

                <div className="space-y-6 pb-6">
                  {DOC_GROUPS.map((grp) => {
                    const filtered = grp.items.filter((it) =>
                      it.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      it.desc.toLowerCase().includes(searchQuery.toLowerCase())
                    );
                    if (filtered.length === 0) return null;

                    return (
                      <div key={grp.group} className="space-y-2">
                        <h4 className="px-1 text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">
                          {grp.group}
                        </h4>
                        <div className="space-y-1">
                          {filtered.map((it) => (
                            <button
                              key={it.id}
                              onClick={() => selectDocSection(it.id)}
                              className={`w-full flex items-center justify-between rounded-xl p-3 text-left transition-colors ${
                                activeDocSection === it.id
                                  ? "bg-zinc-800 text-emerald-400 font-semibold"
                                  : "text-zinc-300 hover:bg-zinc-900"
                              }`}
                            >
                              <div>
                                <div className="text-sm font-semibold">{it.title}</div>
                                <div className="text-xs text-zinc-400">{it.desc}</div>
                              </div>
                              {it.badge && (
                                <span
                                  className={`rounded px-2 py-0.5 text-xs font-mono font-semibold uppercase ${
                                    it.badge === "Live"
                                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                      : it.badge === "Important"
                                      ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                                      : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                                  }`}
                                >
                                  {it.badge}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* SIDEBAR DESKTOP (STICKY SUR ÉCRANS >= lg) */}
          <aside className="hidden lg:block lg:w-80 border-r border-zinc-800/80 bg-zinc-950/90 p-6 overflow-y-auto flex-shrink-0 sticky top-16 h-[calc(100vh-4rem)]">
            {/* Recherche rapide */}
            <div className="relative mb-6">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Filtrer les guides..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 pl-9 pr-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-emerald-500/50 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none transition-colors"
              />
            </div>

            <div className="space-y-6">
              {DOC_GROUPS.map((grp) => {
                const filtered = grp.items.filter((it) =>
                  it.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  it.desc.toLowerCase().includes(searchQuery.toLowerCase())
                );
                if (filtered.length === 0) return null;

                return (
                  <div key={grp.group} className="space-y-1.5">
                    <h4 className="px-3 text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">
                      {grp.group}
                    </h4>
                    <div className="space-y-0.5 pt-1">
                      {filtered.map((it) => (
                        <button
                          key={it.id}
                          onClick={() => selectDocSection(it.id)}
                          className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-all text-left ${
                            activeDocSection === it.id
                              ? "bg-zinc-800 text-emerald-400 shadow-sm font-semibold"
                              : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                          }`}
                        >
                          <span className="truncate">{it.title}</span>
                          {it.badge && (
                            <span
                              className={`rounded px-1.5 py-0.2 text-[10px] font-mono font-semibold uppercase ${
                                it.badge === "Live"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                  : it.badge === "Important"
                                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                                  : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                              }`}
                            >
                              {it.badge}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          {/* MAIN ARTICLE CONTENT (FLUIDE ET RESPONSIVE) */}
          <main className="flex-1 w-full min-w-0 bg-zinc-900/10 px-4 py-8 sm:px-8 lg:px-14 lg:py-12 overflow-y-auto">
            <div className="max-w-3xl mx-auto space-y-10 sm:space-y-12 pb-24">
              {/* ================================================================= */}
              {/* 1. PRÉSENTATION GÉNÉRALE                                          */}
              {/* ================================================================= */}
              {activeDocSection === "intro" && (
                <article className="space-y-8 animate-in fade-in duration-200">
                  <div className="border-b border-zinc-800 pb-6 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-mono font-semibold text-emerald-400 border border-emerald-500/20">
                        v0.1.0 Stable
                      </span>
                      <span className="text-xs sm:text-sm text-zinc-400 font-mono">Architecture Kiosk & Vision Locale</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-zinc-100 flex items-center gap-3">
                      <AgoraExamLogo size={32} />
                      <span>Présentation d'AgoraExam</span>
                    </h1>
                    <p className="text-base sm:text-lg text-zinc-300 leading-relaxed">
                      Alternative open-source et souveraine aux navigateurs d'examen propriétaires (Respondus, Safe Exam Browser, Proctorio).
                    </p>
                  </div>

                  <p className="text-sm sm:text-base text-zinc-200 leading-relaxed">
                    AgoraExam est un navigateur de bureau ultra-léger (&lt; 21 Mo) conçu pour sécuriser les évaluations universitaires sur la plateforme <strong>Moodle</strong>. Il isole l'environnement de travail de l'étudiant, bloque les raccourcis système d'évasion, et s'assure de la présence continue du candidat devant son écran grâce à une vision par ordinateur exécutée <strong>100% en local</strong>.
                  </p>

                  {/* 3 Cartes piliers */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-950/60 space-y-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Lock size={18} />
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-zinc-100">Confinement Kiosk</h3>
                      <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                        Plein écran forcé, neutralisation d'Alt+Tab, Alt+F4, F1-F12, masquage de la barre des tâches et watchdog Rust de recapture de focus (400ms).
                      </p>
                    </div>

                    <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-950/60 space-y-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        <Eye size={18} />
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-zinc-100">Vision Locale Souveraine</h3>
                      <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                        Analyse faciale locale en WebAssembly. Zéro flux vidéo diffusé sur le cloud : respect strict de la vie privée et du RGPD.
                      </p>
                    </div>

                    <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-950/60 space-y-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        <UserCheck size={18} />
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-zinc-100">Surveillance Human-in-the-Loop</h3>
                      <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                        Consignation au dossier et alerte au surveillant au 3ème strike. Seul un humain arbitre une expulsion. 3 politiques configurables (Hybride, Audit, Strict).
                      </p>
                    </div>
                  </div>

                  {/* Tableau synthétique */}
                  <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-950/60 space-y-3">
                    <h3 className="text-sm sm:text-base font-bold text-zinc-100">Spécifications Rapides</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs sm:text-sm">
                      <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                        <span className="text-zinc-400 block text-xs">Poids binaire</span>
                        <strong className="text-zinc-100 font-mono text-sm">20,7 Mo</strong>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                        <span className="text-zinc-400 block text-xs">Empreinte RAM</span>
                        <strong className="text-zinc-100 font-mono text-sm">~85 Mo</strong>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                        <span className="text-zinc-400 block text-xs">Compatibilité</span>
                        <strong className="text-zinc-100 text-sm">Moodle 3.9+ / 4.x</strong>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                        <span className="text-zinc-400 block text-xs">Licence</span>
                        <strong className="text-emerald-400 text-sm">Open-Source (MIT)</strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                    <button
                      onClick={() => selectDocSection("telechargement")}
                      className="min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 transition-colors shadow-sm"
                    >
                      <Download size={16} />
                      <span>Télécharger AgoraExam pour votre OS</span>
                    </button>
                    <button
                      onClick={() => selectDocSection("bac-a-sable")}
                      className="min-h-[44px] flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-5 py-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 transition-colors"
                    >
                      <Camera size={16} />
                      <span>Tester la caméra en direct</span>
                    </button>
                  </div>
                </article>
              )}

              {/* ================================================================= */}
              {/* 2. MATRICE DE TÉLÉCHARGEMENT DIRECT                              */}
              {/* ================================================================= */}
              {activeDocSection === "telechargement" && (
                <article className="space-y-8 animate-in fade-in duration-200">
                  <div className="border-b border-zinc-800 pb-6 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-mono font-semibold text-blue-400 border border-blue-500/20">
                        Distribution Officielle
                      </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-zinc-100">
                      Téléchargements des Binaires
                    </h1>
                    <p className="text-base sm:text-lg text-zinc-300 leading-relaxed">
                      Installez AgoraExam sur votre ordinateur de composition. Chaque version est autonome et optimisée pour votre processeur.
                    </p>
                  </div>

                  {/* Cartes de téléchargement par plateforme avec VRAIS LOGOS */}
                  <div className="space-y-4">
                    {/* Windows */}
                    <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-950/70 hover:border-zinc-700 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2.5">
                          <WindowsLogo size={22} />
                          <h3 className="text-base font-bold text-zinc-100">Windows 10 & 11 (64-bit)</h3>
                          <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                            Recommandé
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-zinc-300">
                          Binaire exécutable autonome (.exe). Aucun droit administrateur requis pour composer.
                        </p>
                        <div className="text-xs font-mono text-zinc-400">
                          Format : Portable / Installateur • Taille : ~20,7 Mo
                        </div>
                      </div>
                      <a
                        href="https://github.com/fadelilyas01/AgoraExam/releases/latest/download/AgoraExam-Setup.exe"
                        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 transition-colors whitespace-nowrap shadow-sm shadow-emerald-500/10"
                      >
                        <WindowsLogo size={16} />
                        <span>Télécharger AgoraExam-Setup.exe</span>
                      </a>
                    </div>

                    {/* macOS Apple Silicon */}
                    <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-950/70 hover:border-zinc-700 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2.5">
                          <AppleLogo size={22} className="text-zinc-100" />
                          <h3 className="text-base font-bold text-zinc-100">macOS (Apple Silicon M1 à M4)</h3>
                          <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs font-mono text-zinc-300">
                            ARM64
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-zinc-300">
                          Image disque (.dmg) native optimisée pour l'architecture Apple Silicon.
                        </p>
                        <div className="text-xs font-mono text-zinc-400">
                          Prérequis : macOS 11.0 (Big Sur) ou ultérieur
                        </div>
                      </div>
                      <a
                        href="https://github.com/fadelilyas01/AgoraExam/releases/latest/download/AgoraExam-aarch64.dmg"
                        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-zinc-100 px-5 py-3 text-sm font-semibold text-zinc-950 hover:bg-white transition-colors whitespace-nowrap"
                      >
                        <AppleLogo size={16} />
                        <span>Télécharger AgoraExam-aarch64.dmg</span>
                      </a>
                    </div>

                    {/* macOS Intel */}
                    <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-950/70 hover:border-zinc-700 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2.5">
                          <AppleLogo size={22} className="text-zinc-400" />
                          <h3 className="text-base font-bold text-zinc-100">macOS (Processeurs Intel)</h3>
                          <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs font-mono text-zinc-300">
                            x86_64
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-zinc-300">
                          Application pour Mac (processeurs Intel). Glissez simplement l'icône dans le dossier Applications.
                        </p>
                        <div className="text-xs font-mono text-zinc-400">
                          Prérequis : macOS 10.15 (Catalina) ou ultérieur
                        </div>
                      </div>
                      <a
                        href="https://github.com/fadelilyas01/AgoraExam/releases/latest/download/AgoraExam-x64.dmg"
                        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-5 py-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 transition-colors whitespace-nowrap"
                      >
                        <AppleLogo size={16} />
                        <span>Télécharger AgoraExam-x64.dmg</span>
                      </a>
                    </div>

                    {/* Linux */}
                    <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-950/70 hover:border-zinc-700 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2.5">
                          <LinuxLogo size={22} />
                          <h3 className="text-base font-bold text-zinc-100">Linux (Ubuntu, Debian, Fedora)</h3>
                          <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs font-mono text-zinc-300">
                            AppImage
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-zinc-300">
                          Paquet autonome universel exécutable directement sur toute distribution moderne.
                        </p>
                        <div className="text-xs font-mono text-zinc-400">
                          Prérequis : GLIBC 2.31+ • chmod +x AgoraExam.AppImage
                        </div>
                      </div>
                      <a
                        href="https://github.com/fadelilyas01/AgoraExam/releases/latest/download/AgoraExam.AppImage"
                        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-5 py-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 transition-colors whitespace-nowrap"
                      >
                        <LinuxLogo size={16} />
                        <span>Télécharger AgoraExam.AppImage</span>
                      </a>
                    </div>
                  </div>

                  {/* Note sur le binaire autonome */}
                  <div className="p-5 sm:p-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 space-y-2.5">
                    <div className="flex items-center gap-2 text-sm font-bold text-emerald-400">
                      <CheckCircle2 size={18} />
                      <span>Exécutable autonome prêt à l'emploi</span>
                    </div>
                    <p className="text-sm sm:text-base text-zinc-200 leading-relaxed">
                      L'application ne requiert aucun privilège administrateur ni modification de votre système : lancez simplement l'exécutable pour entrer directement en salle d'examen sécurisée.
                    </p>
                  </div>
                </article>
              )}

              {/* ================================================================= */}
              {/* 3. VISION LOCALE & RGPD (NON-HYPE)                                */}
              {/* ================================================================= */}
              {/* ================================================================= */}
              {/* PORTAIL ONBOARDING : 1. AUTODIAGNOSTIC EN DIRECT                  */}
              {/* ================================================================= */}
              {(activeDocSection === "onboarding-test" || activeDocSection === "bac-a-sable") && (
                <div className="space-y-6">
                  <div className="border-b border-zinc-800 pb-5 space-y-2">
                    <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-mono font-semibold text-emerald-400 border border-emerald-500/20">
                      Testeur Pré-Vol Candidat
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
                      Autodiagnostic Matériel &amp; Réseau en Direct
                    </h1>
                    <p className="text-sm sm:text-base text-zinc-400">
                      Vérifiez vos autorisations de webcam, la sensibilité du micro avec le VU-mètre interactif, votre écran et la latence réseau.
                    </p>
                  </div>

                  <LiveDiagnosticWidget
                    onStartDryRun={onLaunchApp}
                    onGoToDownloads={() => changeTab("download")}
                  />
                </div>
              )}

              {/* ================================================================= */}
              {/* PORTAIL ONBOARDING : 2. PARCOURS ÉTUDIANT EN 3 ÉTAPES             */}
              {/* ================================================================= */}
              {activeDocSection === "etudiant-guide" && (
                <ThreeStepStudentJourney
                  onStartExamTest={onLaunchApp}
                  onGoToDownloads={() => changeTab("download")}
                  onOpenPrivacy={() => selectDocSection("vie-privee")}
                />
              )}

              {/* ================================================================= */}
              {/* PORTAIL ONBOARDING : 3. VIE PRIVÉE, RGPD & LOI 25                 */}
              {/* ================================================================= */}
              {activeDocSection === "vie-privee" && (
                <PrivacyAndEthicsSection />
              )}

              {/* ================================================================= */}
              {/* PORTAIL ONBOARDING : 4. DÉPANNAGE & CODES D'ERREUR                */}
              {/* ================================================================= */}
              {(activeDocSection === "faq-depannage" || activeDocSection === "depannage-camera") && (
                <InteractiveTroubleshootingFaq />
              )}

              {/* ================================================================= */}
              {/* 3. VISION LOCALE & RGPD (CONSERVÉ)                                */}
              {/* ================================================================= */}
              {activeDocSection === "edge-ai" && (
                <article className="space-y-8 animate-in fade-in duration-200">
                  <div className="border-b border-zinc-800 pb-6 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-mono font-semibold text-emerald-400 border border-emerald-500/20">
                        Privacy by Design
                      </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-zinc-100">
                      Vision par Ordinateur Locale & RGPD
                    </h1>
                    <p className="text-base sm:text-lg text-zinc-300 leading-relaxed">
                      Pourquoi AgoraExam respecte scrupuleusement la vie privée des étudiants en bannissant le streaming vidéo cloud.
                    </p>
                  </div>

                  <p className="text-sm sm:text-base text-zinc-200 leading-relaxed">
                    La plupart des solutions de surveillance en ligne commerciales obligent les étudiants à diffuser leur flux vidéo continu vers des serveurs distants ou des centres de contrôle externes. Cela pose d'importants risques de fuites de données personnelles, de saturation de bande passante et de non-conformité avec le Règlement Général sur la Protection des Données (RGPD).
                  </p>

                  <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 space-y-3">
                    <h3 className="text-base font-bold text-emerald-400 flex items-center gap-2">
                      <Eye size={18} />
                      <span>Le Modèle de Vision Locale d'AgoraExam</span>
                    </h3>
                    <p className="text-sm sm:text-base text-zinc-200 leading-relaxed">
                      AgoraExam intègre un modèle de détection faciale compilé en WebAssembly natif. L'analyse est effectuée image par image directement sur le processeur (CPU) de l'étudiant. Les points de repère faciaux sont analysés à une cadence maîtrisée (5 images par seconde), puis la mémoire tampon est immédiatement écrasée.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 space-y-3">
                      <strong className="text-rose-400 block text-base font-bold">Télésurveillance Traditionnelle (Cloud)</strong>
                      <ul className="space-y-2 text-zinc-200 text-sm list-disc list-inside leading-relaxed">
                        <li>Diffusion continue de la webcam vers le cloud</li>
                        <li>Risque d'interception et stockage sur serveurs tiers</li>
                        <li>Consommation excessive de bande passante (coupures d'examen)</li>
                        <li>Analyse faciale et biométrie conservées indéfiniment</li>
                      </ul>
                    </div>

                    <div className="p-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 space-y-3">
                      <strong className="text-emerald-400 block text-base font-bold">AgoraExam (Vision Locale Souveraine)</strong>
                      <ul className="space-y-2 text-zinc-200 text-sm list-disc list-inside leading-relaxed">
                        <li>Zéro flux vidéo diffusé sur le réseau externe</li>
                        <li>Analyse faciale 100% confinée en mémoire vive locale</li>
                        <li>Fonctionne parfaitement sur des connexions internet modestes</li>
                        <li>Preuves photographiques enregistrées uniquement sur infraction avérée</li>
                      </ul>
                    </div>
                  </div>
                </article>
              )}

              {/* ================================================================= */}
              {/* 4. GUIDE ÉTUDIANT                                                 */}
              {/* ================================================================= */}
              {activeDocSection === "etudiant-guide" && (
                <article className="space-y-8 animate-in fade-in duration-200">
                  <div className="border-b border-zinc-800 pb-6 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-mono font-semibold text-blue-400 border border-blue-500/20">
                        Candidats
                      </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-zinc-100">
                      Guide Étudiant — Passer son Épreuve
                    </h1>
                    <p className="text-base sm:text-lg text-zinc-300 leading-relaxed">
                      Consignes et étapes pour composer sereinement dans les conditions officielles.
                    </p>
                  </div>

                  {/* Étapes chronologiques */}
                  <div className="space-y-5">
                    <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 space-y-2.5">
                      <div className="flex items-center gap-3 text-sm sm:text-base font-bold text-emerald-400">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-mono text-emerald-300">1</span>
                        <span>La Veille : Le Test à Froid</span>
                      </div>
                      <p className="text-sm sm:text-base text-zinc-200 leading-relaxed pl-9">
                        Téléchargez AgoraExam sur votre ordinateur personnel. Lancez l'application pour tester l'accès à la webcam et au microphone. Assurez-vous que l'indicateur d'écran unique passe au vert.
                      </p>
                    </div>

                    <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 space-y-2.5">
                      <div className="flex items-center gap-3 text-sm sm:text-base font-bold text-emerald-400">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-mono text-emerald-300">2</span>
                        <span>15 minutes avant : Préparation de l'environnement</span>
                      </div>
                      <ul className="text-sm sm:text-base text-zinc-200 space-y-2 pl-9 list-disc list-inside leading-relaxed">
                        <li>Fermez impérativement toutes vos applications tierces (Discord, Zoom, Teams, WhatsApp, Spotify, navigateurs web).</li>
                        <li>Débranchez tout écran externe branché en HDMI, DisplayPort ou AirPlay (seul l'écran principal doit être allumé).</li>
                        <li>Placez-vous face à une source de lumière naturelle ou artificielle (évitez les contre-jours violents).</li>
                      </ul>
                    </div>

                    <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 space-y-2.5">
                      <div className="flex items-center gap-3 text-sm sm:text-base font-bold text-emerald-400">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-mono text-emerald-300">3</span>
                        <span>Pendant l'examen : Confinement et Surveillance</span>
                      </div>
                      <p className="text-sm sm:text-base text-zinc-200 leading-relaxed pl-9">
                        Dès que vous cliquez sur « Démarrer l'Examen Sécurisé », votre écran bascule en plein écran exclusif. Composez normalement sur la feuille d'examen Moodle. Conservez votre visage visible face à la caméra durant toute la composition.
                      </p>
                    </div>
                  </div>
                </article>
              )}

              {/* ================================================================= */}
              {/* 5. PROTOCOLE HUMAN-IN-THE-LOOP & RÈGLE DES 3 STRIKES             */}
              {/* ================================================================= */}
              {activeDocSection === "regle-strikes" && (
                <article className="space-y-8 animate-in fade-in duration-200">
                  <div className="border-b border-zinc-800 pb-6 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-mono font-semibold text-emerald-400 border border-emerald-500/20">
                        Éthique & Conformité AI Act
                      </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-zinc-100">
                      Protocole Human-in-the-Loop & Strikes
                    </h1>
                    <p className="text-base sm:text-lg text-zinc-300 leading-relaxed">
                      Gestion éthique des anomalies : consignation au dossier candidat, alerte surveillant en temps réel et politiques configurables pour chaque établissement.
                    </p>
                  </div>

                  <div className="p-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 space-y-2.5">
                    <strong className="text-sm sm:text-base font-bold text-emerald-300 flex items-center gap-2">
                      <ShieldCheck size={18} />
                      <span>Filtre Anti-Faux Positifs (Debounce de 4 secondes)</span>
                    </strong>
                    <p className="text-sm sm:text-base text-zinc-200 leading-relaxed">
                      Les mouvements naturels (baisser la tête pour relire un brouillon, cligner des yeux, éternuer, ramasser un stylo) ne déclenchent aucun avertissement. Le compteur d'infraction ne s'enclenche que si le visage disparaît de manière ininterrompue pendant plus de <strong>4 secondes complètes</strong>.
                    </p>
                  </div>

                  {/* Principe Human-in-the-loop */}
                  <div className="p-6 rounded-2xl border border-blue-500/30 bg-blue-500/10 space-y-3">
                    <strong className="text-sm sm:text-base font-bold text-blue-300 flex items-center gap-2">
                      <UserCheck size={18} />
                      <span>Gouvernance Éthique : L'Humain au Cœur de la Décision</span>
                    </strong>
                    <p className="text-sm sm:text-base text-zinc-200 leading-relaxed">
                      Une déconnexion automatique unilatérale par l'IA est jugée disproportionnée et juridiquement fragile (Règlement Européen sur l'IA). AgoraExam garantit qu'<strong>aucun algorithme ne peut expulser un étudiant sans validation humaine</strong>. Les anomalies sont consignées au dossier de l'étudiant sous forme de preuves horodatées chiffrées, et le surveillant est immédiatement notifié pour statuer.
                    </p>
                  </div>

                  {/* Les 3 niveaux */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                      <SlidersHorizontal size={18} className="text-zinc-400" />
                      <span>Déroulement des Avertissements (Mode Hybride par Défaut)</span>
                    </h3>

                    <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm sm:text-base font-bold text-amber-400">Strike 1 : Premier Avertissement</span>
                        <span className="text-xs font-mono text-zinc-400">Consigné au dossier</span>
                      </div>
                      <p className="text-sm sm:text-base text-zinc-200 leading-relaxed">
                        Affichage d'un modal bloquant de sensibilisation : <em>« Attention : votre visage n'est plus détecté (1/3). L'incident est consigné à votre dossier d'examen. »</em> L'étudiant acquitte et continue son épreuve.
                      </p>
                    </div>

                    <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm sm:text-base font-bold text-orange-400">Strike 2 : Avertissement Solennel</span>
                        <span className="text-xs font-mono text-zinc-400">Cliché horodaté archivé</span>
                      </div>
                      <p className="text-sm sm:text-base text-zinc-200 leading-relaxed">
                        Alerte renforcée rappelant que tout nouvel écart entraînera la transmission immédiate du dossier d'infractions au surveillant de session.
                      </p>
                    </div>

                    <div className="p-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm sm:text-base font-bold text-amber-300">Strike 3 : Alerte Surveillant & Maintien de l'Épreuve</span>
                        <span className="text-xs font-mono text-amber-400 font-bold">Surveillance Humaine Active</span>
                      </div>
                      <p className="text-sm sm:text-base text-zinc-200 leading-relaxed">
                        Le backend Rust notifie instantanément le surveillant de salle (<code className="font-mono text-amber-300">alerter_surveillant</code>). L'épreuve <strong>n'est pas brutalement coupée</strong> : l'étudiant peut continuer de composer tandis que le surveillant examine les preuves horodatées. <strong>Seul le surveillant humain</strong> possède la clé d'expulsion si la triche avérée est confirmée.
                      </p>
                    </div>
                  </div>

                  {/* Les 3 politiques configurables */}
                  <div className="space-y-4 pt-4 border-t border-zinc-800">
                    <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                      <Sliders size={18} className="text-zinc-400" />
                      <span>3 Politiques Configurables par l'Établissement</span>
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-2">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400">
                          Recommandé
                        </span>
                        <h4 className="font-bold text-zinc-100 text-sm">Mode Hybride</h4>
                        <p className="text-xs text-zinc-300 leading-relaxed">
                          Human-in-the-Loop. 3 avertissements avec captures horodatées, puis notification au surveillant humain qui conserve l'arbitrage exclusif.
                        </p>
                      </div>

                      <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-950/60 space-y-2">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400">
                          Formatif
                        </span>
                        <h4 className="font-bold text-zinc-100 text-sm">Mode Pédagogique</h4>
                        <p className="text-xs text-zinc-300 leading-relaxed">
                          Audit Trail continu. Consignation silencieuse sans interruption du candidat, idéal pour les contrôles continus et épreuves blanches.
                        </p>
                      </div>

                      <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-950/60 space-y-2">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-400">
                          Haute Criticité
                        </span>
                        <h4 className="font-bold text-zinc-100 text-sm">Mode Strict</h4>
                        <p className="text-xs text-zinc-300 leading-relaxed">
                          Réservé aux concours certifiants nationaux. Scellement Moodle immédiat au 3ème strike via l'API Web Services pour les sessions sans surveillant.
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              )}

              {/* ================================================================= */}
              {/* 6. DÉPANNAGE CAMÉRA & MICRO                                      */}
              {/* ================================================================= */}
              {activeDocSection === "depannage-camera" && (
                <article className="space-y-8 animate-in fade-in duration-200">
                  <div className="border-b border-zinc-800 pb-6 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-purple-500/10 px-3 py-1 text-xs font-mono font-semibold text-purple-400 border border-purple-500/20">
                        Support Matériel
                      </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-zinc-100">
                      Dépannage Caméra & Microphone
                    </h1>
                    <p className="text-base sm:text-lg text-zinc-300 leading-relaxed">
                      Résolution des blocages d'accès aux périphériques de capture sous Windows et macOS.
                    </p>
                  </div>

                  <div className="space-y-5">
                    <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 space-y-2.5">
                      <h3 className="text-sm sm:text-base font-bold text-zinc-100 flex items-center gap-2">
                        <Sliders size={18} className="text-blue-400" />
                        <span>Conflit d'Exclusivité du Capteur (Windows 10 / 11)</span>
                      </h3>
                      <p className="text-sm sm:text-base text-zinc-200 leading-relaxed">
                        Sous Windows, la plupart des pilotes de webcam ne peuvent pas être partagés entre deux applications simultanément. Si Discord, Zoom, Teams, Skype ou un navigateur web tourne en arrière-plan, AgoraExam ne pourra pas acquérir le flux vidéo.
                      </p>
                      <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs sm:text-sm font-mono text-zinc-300">
                        Solution : Ouvrez le Gestionnaire des tâches (Ctrl+Shift+Esc) et fermez complètement ces applications.
                      </div>
                    </div>

                    <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 space-y-2.5">
                      <h3 className="text-sm sm:text-base font-bold text-zinc-100 flex items-center gap-2">
                        <VideoOff size={18} className="text-amber-400" />
                        <span>Caméras Virtuelles Interdites</span>
                      </h3>
                      <p className="text-sm sm:text-base text-zinc-200 leading-relaxed">
                        Les logiciels de caméras virtuelles (OBS Virtual Camera, ManyCam, Camo, EpocCam) sont automatiquement filtrés ou rejetés. Branchez une webcam USB standard ou activez la caméra intégrée de votre ordinateur portable.
                      </p>
                    </div>

                    <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 space-y-2.5">
                      <h3 className="text-sm sm:text-base font-bold text-zinc-100 flex items-center gap-2">
                        <AppleLogo size={18} className="text-zinc-200" />
                        <span>Autorisations Système macOS</span>
                      </h3>
                      <p className="text-sm sm:text-base text-zinc-200 leading-relaxed">
                        Si votre caméra ne s'allume pas sur Mac, rendez-vous dans :<br />
                        <strong>Réglages Système &gt; Confidentialité et sécurité &gt; Appareil photo</strong> et vérifiez qu'AgoraExam est cochée.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => selectDocSection("bac-a-sable")}
                      className="min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm sm:text-base font-semibold text-zinc-950 hover:bg-emerald-400 transition-colors"
                    >
                      <Camera size={16} />
                      <span>Tester immédiatement dans le Banc d'Essai Live</span>
                    </button>
                  </div>
                </article>
              )}

              {/* ================================================================= */}
              {/* 7. GUIDE ENSEIGNANT                                              */}
              {/* ================================================================= */}
              {activeDocSection === "enseignant-guide" && (
                <article className="space-y-8 animate-in fade-in duration-200">
                  <div className="border-b border-zinc-800 pb-6 space-y-3">
                    <div className="flex items-center gap-2">
                      <MoodleLogo size={18} />
                      <span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-mono font-semibold text-orange-400 border border-orange-500/20">
                        Professeurs & Formateurs
                      </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-zinc-100">
                      Guide Enseignant — Configuration Moodle
                    </h1>
                    <p className="text-base sm:text-lg text-zinc-300 leading-relaxed">
                      Comment contraindre vos étudiants à utiliser AgoraExam sans installer de plugin complexe sur votre serveur Moodle.
                    </p>
                  </div>

                  <div className="p-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 space-y-2.5">
                    <strong className="text-sm sm:text-base font-bold text-emerald-300 flex items-center gap-2">
                      <Lock size={18} />
                      <span>La Méthode par Mot de Passe Masqué</span>
                    </strong>
                    <p className="text-sm sm:text-base text-zinc-200 leading-relaxed">
                      Cette méthode ne nécessite aucune compétence d'administration système et fonctionne immédiatement sur n'importe quel Moodle (version 3.9 à 4.x).
                    </p>
                  </div>

                  <ol className="space-y-3 text-sm sm:text-base text-zinc-200 list-decimal list-inside pl-2 leading-relaxed">
                    <li>
                      Dans votre cours Moodle, créez ou modifiez votre <strong>Test (Quiz)</strong>.
                    </li>
                    <li>
                      Dans la section <strong>« Restrictions supplémentaires sur les tentatives »</strong>, renseignez un mot de passe complexe (ex: <code className="font-mono text-emerald-400 font-semibold">Exam_Secure_2026!</code>). <strong>Ne communiquez jamais ce mot de passe aux étudiants.</strong>
                    </li>
                    <li>
                      Dans la description du test sur Moodle, utilisez notre générateur pour insérer le bouton de lancement sécurisé.
                    </li>
                  </ol>

                  <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 space-y-2.5">
                    <strong className="text-sm sm:text-base font-bold text-zinc-100 block">Résultat garanti anti-triche :</strong>
                    <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                      Tout étudiant tentant d'ouvrir le test depuis un navigateur ordinaire (Chrome, Edge, Safari) sera bloqué par la demande de mot de passe inconnu. L'accès ne sera déverrouillé que depuis AgoraExam, qui injecte la clé et active la surveillance faciale.
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => selectDocSection("generateur-moodle")}
                      className="min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 transition-colors"
                    >
                      <MoodleLogo size={16} />
                      <span>Accéder au Générateur de Bouton Moodle</span>
                    </button>
                  </div>
                </article>
              )}

              {/* ================================================================= */}
              {/* 8. GÉNÉRATEUR MOODLE INTERACTIF                                   */}
              {/* ================================================================= */}
              {activeDocSection === "generateur-moodle" && (
                <article className="space-y-8 animate-in fade-in duration-200">
                  <div className="border-b border-zinc-800 pb-6 space-y-3">
                    <div className="flex items-center gap-2">
                      <MoodleLogo size={18} />
                      <span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-mono font-semibold text-orange-400 border border-orange-500/20">
                        Outil Enseignant Moodle
                      </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-zinc-100">
                      Générateur de Bouton Moodle
                    </h1>
                    <p className="text-base sm:text-lg text-zinc-300 leading-relaxed">
                      Personnalisez et copiez en un clic le bloc HTML officiel à intégrer dans la description de votre épreuve Moodle.
                    </p>
                  </div>

                  {/* Formulaire de configuration */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs sm:text-sm font-semibold text-zinc-300 block mb-1.5">ID du Test Moodle (quizid)</label>
                      <input
                        type="text"
                        value={moodleQuizId}
                        onChange={(e) => setMoodleQuizId(e.target.value)}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm font-mono text-zinc-100 focus:border-emerald-500/50 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs sm:text-sm font-semibold text-zinc-300 block mb-1.5">Adresse Moodle (URL)</label>
                      <input
                        type="text"
                        value={moodleUrl}
                        onChange={(e) => setMoodleUrl(e.target.value)}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-100 focus:border-emerald-500/50 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs sm:text-sm font-semibold text-zinc-300 block mb-1.5">Intitulé de l'Épreuve</label>
                      <input
                        type="text"
                        value={examName}
                        onChange={(e) => setExamName(e.target.value)}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-100 focus:border-emerald-500/50 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                      />
                    </div>
                  </div>

                  {/* Prévisualisation Réactive Sécurisée (Zero dangerouslySetInnerHTML) */}
                  <div className="space-y-3">
                    <span className="text-xs sm:text-sm font-mono font-bold text-zinc-400 uppercase tracking-wider block">
                      Aperçu tel qu'affiché pour l'étudiant dans Moodle :
                    </span>
                    <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-950/80 flex justify-center">
                      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 text-center max-w-[560px] w-full font-sans text-zinc-100 shadow-sm space-y-3">
                        <div className="inline-flex items-center gap-2">
                          <span className="bg-emerald-500 w-2.5 h-2.5 rounded-full inline-block" />
                          <span className="text-[13px] uppercase tracking-wider text-emerald-400 font-bold">
                            Épreuve Officielle Sécurisée
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-white break-words">
                          {examName || "Intitulé de l'Épreuve"}
                        </h3>
                        <p className="text-sm text-zinc-400 leading-relaxed">
                          Cet examen exige l'utilisation d'<strong>AgoraExam</strong>. Débranchez tout écran externe et fermez toute application tierce avant d'ouvrir le test.
                        </p>
                        <div className="pt-2">
                          <span className="inline-block bg-emerald-500 text-zinc-950 font-bold text-sm px-6 py-3 rounded-lg shadow-sm pointer-events-none select-none">
                            Lancer l'Épreuve dans AgoraExam
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Code et Copie */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm font-mono font-bold text-zinc-400 uppercase">Code HTML à copier :</span>
                      <button
                        onClick={() => copyToClipboard(generatedMoodleHtml, "moodle-btn")}
                        className="text-xs sm:text-sm text-emerald-400 hover:underline flex items-center gap-1.5 font-semibold"
                      >
                        {copiedSnippet === "moodle-btn" ? <Check size={16} /> : <Copy size={16} />}
                        <span>{copiedSnippet === "moodle-btn" ? "Copié !" : "Copier le Code HTML"}</span>
                      </button>
                    </div>
                    <pre className="p-4 sm:p-5 rounded-2xl border border-zinc-800 bg-zinc-950 text-xs sm:text-sm font-mono text-zinc-300 overflow-x-auto leading-relaxed">
                      {generatedMoodleHtml}
                    </pre>
                  </div>
                </article>
              )}

              {/* ================================================================= */}
              {/* 9. DSI : DÉPLOIEMENT EN MASSE                                     */}
              {/* ================================================================= */}
              {activeDocSection === "dsi-deploiement" && (
                <article className="space-y-8 animate-in fade-in duration-200">
                  <div className="border-b border-zinc-800 pb-6 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-purple-500/10 px-3 py-1 text-xs font-mono font-semibold text-purple-400 border border-purple-500/20">
                        Administrateurs Systèmes
                      </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-zinc-100">
                      Déploiement Centralisé (GPO / Intune)
                    </h1>
                    <p className="text-base sm:text-lg text-zinc-300 leading-relaxed">
                      Installation automatisée et silencieuse sur les parcs de machines universitaires.
                    </p>
                  </div>

                  <div className="space-y-5">
                    <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 space-y-3">
                      <h3 className="text-base font-bold text-zinc-100">Installation silencieuse MSI (Active Directory / Intune)</h3>
                      <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                        Pour déployer AgoraExam simultanément sur des centaines de postes en salle d'examen sans intervention humaine :
                      </p>
                      <pre className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-xs sm:text-sm font-mono text-emerald-300 overflow-x-auto">
                        msiexec.exe /i "\\serveur-partage\AgoraExam\AgoraExam.msi" /qn /norestart ALLUSERS=1
                      </pre>
                    </div>

                    <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 space-y-2.5">
                      <h3 className="text-base font-bold text-zinc-100">Flux réseau & Pare-feu</h3>
                      <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                        AgoraExam ne nécessite l'ouverture d'aucun port exotique. Seul le trafic sortant <strong>HTTPS (Port 443)</strong> vers l'URL du Moodle de l'établissement est requis. Aucun port de streaming vidéo ou serveur WebRTC externe n'a besoin d'être ouvert.
                      </p>
                    </div>
                  </div>
                </article>
              )}

              {/* ================================================================= */}
              {/* 10. DSI : SÉCURITÉ INDUSTRIELLE & DEVSECOPS                       */}
              {/* ================================================================= */}
              {activeDocSection === "dsi-securite" && (
                <article className="space-y-8 animate-in fade-in duration-200">
                  <div className="border-b border-zinc-800 pb-6 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-rose-500/10 px-3 py-1 text-xs font-mono font-semibold text-rose-400 border border-rose-500/20">
                        Audit & Spécifications Défensives
                      </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-zinc-100">
                      Spécifications de Cybersécurité
                    </h1>
                    <p className="text-base sm:text-lg text-zinc-300 leading-relaxed">
                      Détail exhaustif des verrous matériels, cryptographiques et système implémentés dans AgoraExam.
                    </p>
                  </div>

                  <div className="space-y-5">
                    <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 space-y-2.5">
                      <h3 className="text-base font-bold text-emerald-400">1. Watchdog Rust Asynchrone (Boucle 400ms)</h3>
                      <p className="text-sm sm:text-base text-zinc-200 leading-relaxed">
                        Une tâche de fond Tokio surveille en permanence la fenêtre de l'examen. Dès qu'une perte de focus (<code className="font-mono text-zinc-100 font-semibold">Focused(false)</code>) ou une tentative de minimisation est détectée, le runtime force immédiatement la reprise du focus et réaffirme la propriété <code className="font-mono text-zinc-100 font-semibold">always_on_top</code>.
                      </p>
                    </div>

                    <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 space-y-2.5">
                      <h3 className="text-base font-bold text-emerald-400">2. Piège Clavier en Phase de Capture</h3>
                      <p className="text-sm sm:text-base text-zinc-200 leading-relaxed">
                        Les raccourcis système (<code className="font-mono text-zinc-100 font-semibold">Alt+Tab, Alt+F4, F1-F12, Ctrl+W, Ctrl+T, Ctrl+N, Ctrl+Shift+I</code>) sont neutralisés au niveau le plus haut du DOM (<code className="font-mono text-zinc-100 font-semibold">capture: true</code>). Toute tentative déclenche une notification d'infraction immédiate.
                      </p>
                    </div>

                    <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 space-y-2.5">
                      <h3 className="text-base font-bold text-emerald-400">3. Nettoyage Cryptographique en RAM (Zeroize)</h3>
                      <p className="text-sm sm:text-base text-zinc-200 leading-relaxed">
                        Les jetons de session Moodle et identifiants sensibles implémentent le trait Rust <code className="font-mono text-zinc-100 font-semibold">ZeroizeOnDrop</code>. Dès la fin de leur portée, les zones de mémoire vive correspondantes sont écrasées par des zéros pour empêcher toute extraction par dump mémoire.
                      </p>
                    </div>

                    <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 space-y-2.5">
                      <h3 className="text-base font-bold text-emerald-400">4. Pile TLS 100% Rust (rustls / ring)</h3>
                      <p className="text-sm sm:text-base text-zinc-200 leading-relaxed">
                        Toutes les communications HTTPS vers Moodle utilisent la pile TLS native en mémoire sécurisée Rust (<code className="font-mono text-zinc-100 font-semibold">rustls</code>), éliminant les risques de corruption mémoire inhérents aux bibliothèques C OpenSSL historiques.
                      </p>
                    </div>
                  </div>
                </article>
              )}

              {/* ================================================================= */}
              {/* 11. BANC D'ESSAI CAMÉRA LIVE                                      */}
              {/* ================================================================= */}
              {activeDocSection === "bac-a-sable" && (
                <article className="space-y-8 animate-in fade-in duration-200">
                  <div className="border-b border-zinc-800 pb-6 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-mono font-semibold text-emerald-400 border border-emerald-500/20">
                        Testeur Interactif
                      </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-zinc-100">
                      Banc d'Essai Caméra en Direct
                    </h1>
                    <p className="text-base sm:text-lg text-zinc-300 leading-relaxed">
                      Testez le fonctionnement de votre webcam et vérifiez votre éclairage avant de démarrer un examen officiel.
                    </p>
                  </div>

                  <div className="p-6 sm:p-8 rounded-2xl border border-zinc-800 bg-zinc-950/80 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-base font-bold text-zinc-100">Miroir de Cadrage Vidéo</h3>
                        <p className="text-xs sm:text-sm text-zinc-400">Vérifiez que votre visage est bien centré et éclairé.</p>
                      </div>
                      <button
                        onClick={toggleSandboxCamera}
                        className={`min-h-[44px] rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
                          sandboxActive
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30"
                            : "bg-emerald-500 text-zinc-950 hover:bg-emerald-400 shadow-sm"
                        }`}
                      >
                        {sandboxActive ? "Éteindre la Caméra" : "Activer la Caméra"}
                      </button>
                    </div>

                    {sandboxError && (
                      <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-sm text-rose-300 space-y-1">
                        <strong className="block font-semibold">Incident Détecté :</strong>
                        <p>{sandboxError}</p>
                      </div>
                    )}

                    <div className="aspect-video w-full max-w-xl mx-auto rounded-2xl overflow-hidden bg-black border border-zinc-800 flex items-center justify-center relative shadow-inner">
                      {sandboxActive ? (
                        <video
                          ref={(el) => {
                            sandboxVideoRef.current = el;
                            if (el && sandboxStream && el.srcObject !== sandboxStream) {
                              el.srcObject = sandboxStream;
                              el.play().catch((err) => console.warn("Lecture sandbox :", err));
                            }
                          }}
                          autoPlay
                          playsInline
                          muted
                          className="h-full w-full object-cover -scale-x-100"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-zinc-500 gap-3 p-6 text-center">
                          <Camera size={40} className="text-zinc-700" />
                          <span className="text-sm font-semibold text-zinc-300">Caméra désactivée</span>
                          <span className="text-xs sm:text-sm text-zinc-500 max-w-sm">
                            Cliquez sur « Activer la Caméra » ci-dessus pour prévisualiser votre retour vidéo avant l'examen.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              )}
            </div>
          </main>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. FOOTER GLOBAL                                                          */}
      {/* ========================================================================= */}
      <footer className="border-t border-zinc-800/80 bg-zinc-950 px-4 sm:px-6 py-8 sm:py-10 text-xs sm:text-sm text-zinc-400">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-4 text-center">
          {/* Logo & Identité */}
          <div className="flex items-center gap-2 text-zinc-200 font-semibold">
            <AgoraExamLogo size={20} />
            <span className="text-sm font-bold tracking-tight">AgoraExam</span>
          </div>

          {/* Mentions empilées proprement sur mobile */}
          <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-xs text-zinc-400">
            <span>Logiciel libre et gratuit sous licence MIT</span>
            <span className="hidden sm:inline text-zinc-600">•</span>
            <span>Conçu pour l'enseignement supérieur et Moodle</span>
          </div>

          {/* Liens de navigation avec cibles tactiles confortables */}
          <nav className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-6 pt-1 text-xs sm:text-sm font-medium text-zinc-300" aria-label="Liens de pied de page">
            <button
              onClick={() => changeTab("home")}
              className="hover:text-emerald-400 transition-colors py-1 px-2"
            >
              Accueil
            </button>
            <button
              onClick={() => changeTab("download")}
              className="hover:text-emerald-400 transition-colors py-1 px-2"
            >
              Téléchargements
            </button>
            <button
              onClick={() => changeTab("docs")}
              className="hover:text-emerald-400 transition-colors py-1 px-2"
            >
              Documentation
            </button>
            <a
              href="https://github.com/fadelilyas01/AgoraExam"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-emerald-400 transition-colors inline-flex items-center gap-1.5 py-1 px-2"
            >
              <GitHubLogo size={14} />
              <span>GitHub</span>
            </a>
          </nav>

          <p className="text-[11px] text-zinc-600 pt-2 font-mono">
            AgoraExam — Respect absolu de la vie privée & Souveraineté académique
          </p>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* MODAL DE RECONNAISSANCE DU LOGICIEL ET ASSISTANCE AU TÉLÉCHARGEMENT       */}
      {/* ========================================================================= */}
      {downloadModalData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby="download-modal-title"
        >
          <div
            className="fixed inset-0"
            onClick={() => setDownloadModalData(null)}
          />
          <div className="relative z-10 max-w-lg w-full max-h-[90vh] overflow-y-auto rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-8 space-y-5 sm:space-y-6 shadow-2xl animate-in zoom-in-95 duration-150 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
            {/* Header avec grand Logo AgoraExam */}
            <div className="flex items-start justify-between border-b border-zinc-800 pb-5">
              <div className="flex items-center gap-4">
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 border border-emerald-500/40 p-2.5 shadow-xl shadow-emerald-500/10 shrink-0">
                  <AgoraExamLogo size={42} />
                  <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-zinc-950"></span>
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                      Téléchargement Lancé
                    </span>
                    <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-400 border border-emerald-500/20">
                      v0.1.0
                    </span>
                  </div>
                  <h3 id="download-modal-title" className="text-lg sm:text-xl font-bold text-zinc-100">
                    AgoraExam est en route !
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    {downloadModalData.filename} ({downloadModalData.size})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDownloadModalData(null)}
                className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500"
                aria-label="Fermer la fenêtre"
              >
                <X size={18} />
              </button>
            </div>

            {/* Encart Visuel de Reconnaissance du Fichier dans l'Explorateur */}
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-2.5">
              <span className="text-xs font-semibold text-emerald-300 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400" />
                <span>Reconnaître l'application dans vos Téléchargements</span>
              </span>
              <div className="flex items-center gap-3.5 p-3 rounded-xl bg-zinc-950/90 border border-zinc-800 shadow-inner">
                <div className="h-12 w-12 rounded-xl bg-zinc-900 border border-emerald-500/40 p-2 flex items-center justify-center shrink-0">
                  <AgoraExamLogo size={32} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs sm:text-sm font-bold text-zinc-100 truncate">
                    {downloadModalData.filename}
                  </div>
                  <div className="text-[11px] text-zinc-400 font-mono">
                    {downloadModalData.os === "windows"
                      ? "Application Microsoft Windows (64-bit)"
                      : downloadModalData.os === "mac"
                      ? "Image Disque Apple (macOS)"
                      : "Paquet Exécutable Universel Linux"}
                  </div>
                </div>
                <span className="shrink-0 px-2.5 py-1 rounded-lg bg-zinc-800 text-[10px] font-mono font-semibold text-emerald-400 border border-zinc-700">
                  Signé SHA-256
                </span>
              </div>
            </div>

            {/* Consignes pas à pas selon l'OS */}
            <div className="space-y-2 text-xs sm:text-sm text-zinc-300">
              <span className="font-semibold text-zinc-200 block text-xs uppercase tracking-wider font-mono">
                Consignes d'ouverture :
              </span>
              <div className="space-y-2">
                {downloadModalData.instructions.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[11px] font-mono font-bold text-emerald-400 border border-zinc-700">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </div>
                ))}
              </div>
              {downloadModalData.terminalCommand && (
                <div className="pt-2">
                  <span className="text-[11px] text-zinc-400 block mb-1 font-mono">
                    Commande terminal rapide (si nécessaire) :
                  </span>
                  <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-xs font-mono">
                    <code className="text-emerald-300 truncate mr-2">{downloadModalData.terminalCommand}</code>
                    <button
                      onClick={() => copyToClipboard(downloadModalData.terminalCommand!, "cmd")}
                      className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold"
                    >
                      {copiedSnippet === "cmd" ? "Copié !" : "Copier"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer avec SHA-256 et validation */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-zinc-800 text-xs font-mono text-zinc-400">
              <button
                onClick={() => copyToClipboard(downloadModalData.sha256, "sha")}
                className="flex items-center gap-1.5 hover:text-emerald-400 transition-colors"
                title="Copier l'empreinte SHA-256"
              >
                <Copy size={13} />
                <span>SHA-256 : {downloadModalData.sha256.slice(0, 14)}...</span>
                {copiedSnippet === "sha" && <span className="text-emerald-400">✓</span>}
              </button>
              <button
                onClick={() => setDownloadModalData(null)}
                className="w-full sm:w-auto min-h-[42px] px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold transition-all shadow-md shadow-emerald-500/10 active:scale-[0.98]"
              >
                J'ai compris, merci !
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PALETTE DE COMMANDES RAPIDE (⌘K / Ctrl+K)                                 */}
      {/* ========================================================================= */}
      {commandPaletteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[max(1.5rem,env(safe-area-inset-top,0px))] sm:pt-24 px-3 sm:px-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-label="Palette de commandes"
        >
          <div
            className="fixed inset-0"
            onClick={() => setCommandPaletteOpen(false)}
          />
          <div className="relative z-10 max-w-xl w-full max-h-[85vh] flex flex-col rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Barre de recherche */}
            <div className="flex items-center border-b border-zinc-800 px-4 py-3.5 gap-3">
              <Search size={18} className="text-emerald-400 shrink-0" />
              <input
                autoFocus
                type="text"
                placeholder="Rechercher une action, un téléchargement, un guide..."
                value={commandSearch}
                onChange={(e) => setCommandSearch(e.target.value)}
                className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-emerald-500 focus:outline-none rounded-lg px-2 py-1"
              />
              <kbd className="hidden sm:inline-block rounded bg-zinc-900 px-2 py-0.5 text-[10px] font-mono text-zinc-400 border border-zinc-800">
                ESC
              </kbd>
            </div>

            {/* Liste de commandes filtrées */}
            <div className="max-h-96 overflow-y-auto p-2 space-y-4">
              {ALL_COMMANDS.map((category) => {
                const filtered = category.items.filter(
                  (it) =>
                    it.title.toLowerCase().includes(commandSearch.toLowerCase()) ||
                    it.desc.toLowerCase().includes(commandSearch.toLowerCase())
                );
                if (filtered.length === 0) return null;

                return (
                  <div key={category.category} className="space-y-1">
                    <span className="px-3 text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                      {category.category}
                    </span>
                    <div className="space-y-0.5 pt-1">
                      {filtered.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            item.action();
                            setCommandPaletteOpen(false);
                          }}
                          className="w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-left hover:bg-zinc-900 transition-colors group focus-visible:ring-2 focus-visible:ring-emerald-500"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="text-sm font-semibold text-zinc-200 group-hover:text-emerald-400 transition-colors">
                              {item.title}
                            </div>
                            <div className="text-xs text-zinc-400 truncate">{item.desc}</div>
                          </div>
                          {item.badge && (
                            <span className="shrink-0 rounded-md bg-zinc-800 px-2 py-0.5 text-[10px] font-mono text-zinc-300 border border-zinc-700">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer de la palette */}
            <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-2.5 bg-zinc-900/50 text-[11px] font-mono text-zinc-400">
              <div className="flex items-center gap-3">
                <span>↑↓ pour naviguer</span>
                <span>•</span>
                <span>Entrée pour valider</span>
              </div>
              <span className="text-emerald-400 font-semibold">AgoraExam ⌘K</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
