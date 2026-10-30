
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
  AlertTriangle,
  Server,
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
} from "lucide-react";
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
    group: "Bien Démarrer",
    items: [
      { id: "intro", title: "Présentation Générale", desc: "Vision & architecture du navigateur" },
      { id: "edge-ai", title: "Vision Locale & RGPD", desc: "Traitement 100% sur l'appareil sans cloud", badge: "Souverain" },
      { id: "telechargement", title: "Matrice Téléchargements", desc: "Binaires Windows, macOS & Linux" },
    ],
  },
  {
    group: "Guide Candidat",
    items: [
      { id: "etudiant-guide", title: "Déroulement de l'Examen", desc: "Étapes avant et pendant l'épreuve" },
      { id: "regle-strikes", title: "Règle 3 Strikes & 4s", desc: "Tolérance anti-faux positifs & Kill Switch", badge: "Important" },
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
  const [mobileDocsDrawerOpen, setMobileDocsDrawerOpen] = useState<boolean>(false);

  // Détection automatique de l'OS de l'utilisateur
  const [detectedOs, setDetectedOs] = useState<"windows" | "mac" | "linux">("windows");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const ua = window.navigator.userAgent.toLowerCase();
      if (ua.includes("mac")) setDetectedOs("mac");
      else if (ua.includes("linux")) setDetectedOs("linux");
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

  // États du générateur Moodle
  const [moodleQuizId, setMoodleQuizId] = useState<string>("142");
  const [moodleUrl, setMoodleUrl] = useState<string>("https://moodle.universite.fr");
  const [examName, setExamName] = useState<string>("Algorithmique Avancée");

  // États du Bac à Sable Caméra Live
  const [sandboxStream, setSandboxStream] = useState<MediaStream | null>(null);
  const [sandboxActive, setSandboxActive] = useState<boolean>(false);
  const [sandboxError, setSandboxError] = useState<string | null>(null);
  const sandboxVideoRef = useRef<HTMLVideoElement>(null);

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

    try {
      setSandboxError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
      });
      setSandboxStream(stream);
      setSandboxActive(true);
      if (sandboxVideoRef.current) {
        sandboxVideoRef.current.srcObject = stream;
        await sandboxVideoRef.current.play();
      }
    } catch (err: any) {
      setSandboxError(
        err.name === "NotAllowedError"
          ? "Permission refusée. Veuillez autoriser la webcam dans votre navigateur."
          : `Erreur d'accès à la caméra : ${err.message || err.name}`
      );
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

  const generatedMoodleHtml = `<!-- Bloc AgoraExam officiel pour description de quiz Moodle -->
<div style="background:#09090b; border:1px solid #27272a; border-radius:12px; padding:24px; text-align:center; max-width:560px; margin:20px auto; font-family:'Inter',system-ui,sans-serif; color:#f4f4f5;">
  <div style="display:inline-flex; align-items:center; gap:8px; margin-bottom:12px;">
    <span style="background:#10b981; width:10px; height:10px; border-radius:50%; display:inline-block;"></span>
    <span style="font-size:13px; text-transform:uppercase; letter-spacing:0.06em; color:#10b981; font-weight:700;">Épreuve Officielle Sécurisée</span>
  </div>
  <h3 style="margin:0 0 10px 0; font-size:18px; font-weight:700; color:#ffffff;">${examName}</h3>
  <p style="font-size:14px; color:#a1a1aa; margin:0 0 18px 0; line-height:1.6;">
    Cet examen exige l'utilisation d'<strong>AgoraExam</strong>. Débranchez tout écran externe et fermez toute application tierce avant d'ouvrir le test.
  </p>
  <a href="agoraexam://launch?quizid=${moodleQuizId}&host=${encodeURIComponent(moodleUrl)}" 
     style="display:inline-block; background:#10b981; color:#09090b; font-weight:700; font-size:14px; padding:12px 26px; border-radius:8px; text-decoration:none; box-shadow:0 4px 12px rgba(16,185,129,0.25);">
    Lancer l'Épreuve dans AgoraExam
  </a>
</div>`;

  return (
    <div className="min-h-screen w-full bg-zinc-950 text-zinc-100 font-sans antialiased selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* ========================================================================= */}
      {/* 1. BARRE DE NAVIGATION PRINCIPALE (HEADER RESPONSIVE)                      */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md">
        <div className="flex h-16 w-full items-center justify-between px-4 sm:px-6 lg:px-12">
          {/* Logo Brand Officiel */}
          <div className="flex items-center gap-6 lg:gap-8">
            <button
              onClick={() => changeTab("home")}
              className="flex items-center gap-3 text-left group focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-xl"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 group-hover:border-emerald-500/50 transition-colors shadow-sm">
                <AgoraExamLogo size={26} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold tracking-tight text-zinc-100">AgoraExam</span>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-mono font-semibold text-emerald-400 border border-emerald-500/20">
                    Open-Source
                  </span>
                </div>
                <p className="text-xs text-zinc-400 hidden sm:block">Navigateur d'Examen Sécurisé Moodle</p>
              </div>
            </button>

            {/* Navigation Desktop */}
            <nav className="hidden md:flex items-center gap-1.5">
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
            <a
              href="https://github.com/fadelilyas01/AgoraExam"
              target="_blank"
              rel="noreferrer"
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

          {/* Bouton Hamburger Mobile (< md) */}
          <div className="flex sm:hidden items-center gap-2">
            <button
              onClick={() => changeTab("download")}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-emerald-400 transition-all"
            >
              <Download size={14} />
              <span>Installer</span>
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500"
              aria-label="Menu principal"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Tiroir Déroulant Menu Mobile */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-zinc-800 bg-zinc-950/98 px-5 py-4 space-y-4 backdrop-blur-xl animate-in slide-in-from-top-2 duration-150">
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
                rel="noreferrer"
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
          <section className="relative overflow-hidden pt-12 sm:pt-20 lg:pt-28 text-center px-4 sm:px-6 max-w-5xl mx-auto space-y-6 sm:space-y-8">
            {/* Pill Notification Institutionnelle (Zéro Cliché IA) */}
            <div className="inline-flex items-center gap-2.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs sm:text-sm font-medium text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
              <span>Version 0.1.0 Stable Disponible — Alternative Open-Source et Souveraine à Respondus</span>
            </div>

            {/* Titre & Sous-titre Épurés et Rigoureux */}
            <div className="space-y-4 sm:space-y-5 max-w-4xl mx-auto">
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-zinc-100 leading-[1.15]">
                Le Navigateur d'Examen Sécurisé & Verrouillage Kiosk pour Moodle
              </h1>
              <p className="text-base sm:text-lg lg:text-xl text-zinc-300 max-w-3xl mx-auto leading-relaxed">
                Verrouillage hermétique du système d'exploitation et vérification de présence biométrique exécutée{" "}
                <strong>100% sur l'ordinateur de l'étudiant</strong>. Zéro flux vidéo dans le cloud. Conforme RGPD et souveraineté académique.
              </p>
            </div>

            {/* Call To Actions de Téléchargement */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
              {detectedOs === "windows" ? (
                <a
                  href="./downloads/AgoraExam-Setup.exe"
                  download="AgoraExam-Setup.exe"
                  className="w-full sm:w-auto min-h-[48px] flex items-center justify-center gap-2.5 rounded-xl bg-emerald-500 px-7 py-3.5 text-sm sm:text-base font-semibold text-zinc-950 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
                >
                  <WindowsLogo size={18} />
                  <span>Télécharger pour Windows (.exe)</span>
                </a>
              ) : (
                <button
                  onClick={() => changeTab("download")}
                  className="w-full sm:w-auto min-h-[48px] flex items-center justify-center gap-2.5 rounded-xl bg-emerald-500 px-7 py-3.5 text-sm sm:text-base font-semibold text-zinc-950 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
                >
                  {detectedOs === "mac" ? <AppleLogo size={18} /> : <LinuxLogo size={18} />}
                  <span>
                    Télécharger pour {detectedOs === "mac" ? "macOS (.dmg)" : "Linux (.AppImage)"}
                  </span>
                </button>
              )}

              <button
                onClick={() => changeTab("docs")}
                className="w-full sm:w-auto min-h-[48px] flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 px-7 py-3.5 text-sm sm:text-base font-semibold text-zinc-200 hover:bg-zinc-800 hover:text-white transition-colors"
              >
                <BookOpen size={17} className="text-zinc-400" />
                <span>Consulter la Documentation</span>
              </button>
            </div>

            {/* Micro-labels rassurants */}
            <div className="pt-3 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-zinc-400 font-mono">
              <span className="flex items-center gap-1.5">
                <Check size={16} className="text-emerald-400" /> &lt; 21 Mo
              </span>
              <span className="hidden sm:inline">•</span>
              <span className="flex items-center gap-1.5">
                <Check size={16} className="text-emerald-400" /> Zéro Inscription
              </span>
              <span className="hidden sm:inline">•</span>
              <span className="flex items-center gap-1.5">
                <Check size={16} className="text-emerald-400" /> 100% Open-Source MIT
              </span>
            </div>

            {/* Mockup / Aperçu Réaliste de l'Interface de l'Application Kiosk */}
            <div className="pt-6 sm:pt-8">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-2 sm:p-3 shadow-2xl ring-1 ring-zinc-800/80 max-w-4xl mx-auto overflow-hidden">
                <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-4 sm:p-6 text-left space-y-4">
                  {/* Fausse barre de titre avec Logo Réel AgoraExam */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-3 gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center gap-1.5 mr-2">
                        <div className="h-3 w-3 rounded-full bg-rose-500/80" />
                        <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                        <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                      </div>
                      <AgoraExamLogo size={18} />
                      <span className="text-xs sm:text-sm font-mono text-zinc-200 font-semibold">
                        AgoraExam • Session Kiosk Verrouillée
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      Vérification de Présence Locale : 30 FPS (0 flux cloud)
                    </div>
                  </div>

                  {/* Contenu simulé responsive */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                    <div className="md:col-span-2 p-4 sm:p-5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-3">
                      <div className="flex items-center justify-between text-xs sm:text-sm font-mono text-zinc-400">
                        <span className="flex items-center gap-1.5">
                          <MoodleLogo size={14} />
                          <span>Épreuve : Algorithmique Avancée</span>
                        </span>
                        <span className="text-emerald-400 font-semibold">Question 3 / 8</span>
                      </div>
                      <p className="text-sm sm:text-base text-zinc-200 leading-relaxed">
                        Implémentation d'une table de hachage avec adressage ouvert et détection de collisions...
                      </p>
                      <div className="rounded-lg bg-zinc-900/90 border border-zinc-800 p-3 font-mono text-xs sm:text-sm text-zinc-300 overflow-x-auto">
                        fn hash_search(key: &amp;str) -&gt; Option&lt;u32&gt; &#123; ... &#125;
                      </div>
                    </div>

                    <div className="p-4 sm:p-5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 flex flex-col justify-between gap-4">
                      <div className="space-y-2.5">
                        <div className="text-xs sm:text-sm font-semibold text-zinc-200 flex items-center gap-2">
                          <Camera size={15} className="text-emerald-400" />
                          <span>Webcam PiP Candidat</span>
                        </div>
                        <div className="aspect-video w-full rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs text-zinc-400 font-mono">
                          1 Visage • Cadrage Conforme
                        </div>
                      </div>
                      <div className="text-xs sm:text-sm text-zinc-400 font-mono pt-3 border-t border-zinc-800 flex items-center justify-between">
                        <span>Strikes : 0 / 3</span>
                        <span className="text-emerald-400 font-semibold">Statut Conforme</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Grille Bento des Fonctionnalités Clés */}
          <section className="px-4 sm:px-6 max-w-6xl mx-auto space-y-10 sm:space-y-12">
            <div className="text-center space-y-3 max-w-2xl mx-auto">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-zinc-100">
                L'Excellence Technique au Service de la Justice Académique
              </h2>
              <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                Conçu pour garantir l'intégrité de l'examen sans transformer l'ordinateur de l'étudiant en mouchard intrusif.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {/* Carte 1 */}
              <div className="p-6 sm:p-7 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-3.5 hover:border-zinc-700 transition-colors">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-800 text-emerald-400 border border-zinc-700/60">
                  <Lock size={22} />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-zinc-100">Verrouillage Système Absolu</h3>
                <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                  Plein écran forcé, neutralisation d'Alt+Tab, Alt+F4, Cmd+Tab, captures d'écran, masquage du Dock et de la barre des tâches.
                </p>
              </div>

              {/* Carte 2 */}
              <div className="p-6 sm:p-7 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-3.5 hover:border-zinc-700 transition-colors">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-800 text-blue-400 border border-zinc-700/60">
                  <Monitor size={22} />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-zinc-100">Anti-Multi-Écran Matériel</h3>
                <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                  Interrogation directe du système d'exploitation en Rust : impossible de lancer l'examen si un câble HDMI, DisplayPort ou AirPlay est actif.
                </p>
              </div>

              {/* Carte 3 - Vision Locale (Non-Hype AI) */}
              <div className="p-6 sm:p-7 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-3.5 hover:border-zinc-700 transition-colors">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-800 text-emerald-400 border border-zinc-700/60">
                  <Eye size={22} />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-zinc-100">Vision Embarquée Souveraine</h3>
                <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                  Analyse des repères faciaux exécutée localement dans la mémoire vive de l'ordinateur. Aucun flux vidéo n'est envoyé vers des serveurs distants.
                </p>
              </div>

              {/* Carte 4 */}
              <div className="p-6 sm:p-7 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-3.5 hover:border-zinc-700 transition-colors">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-800 text-amber-400 border border-zinc-700/60">
                  <AlertTriangle size={22} />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-zinc-100">3 Strikes avec Tolérance 4s</h3>
                <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                  Pas de pénalité arbitraire sur un clignement d'yeux ou un éternuement. Au 3ème avertissement avéré, soumission automatique sur Moodle.
                </p>
              </div>

              {/* Carte 5 */}
              <div className="p-6 sm:p-7 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-3.5 hover:border-zinc-700 transition-colors">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-800 text-purple-400 border border-zinc-700/60">
                  <Camera size={22} />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-zinc-100">Preuves Photographiques Scellées</h3>
                <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                  Seules les infractions avérées enregistrent une photo locale horodatée scellée avec son empreinte SHA-256 pour les jurys.
                </p>
              </div>

              {/* Carte 6 - Moodle Logo */}
              <div className="p-6 sm:p-7 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-3.5 hover:border-zinc-700 transition-colors">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-800 text-orange-400 border border-zinc-700/60">
                  <MoodleLogo size={22} />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-zinc-100">Zéro Plugin Moodle Obligatoire</h3>
                <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                  L'enseignant configure son test avec un mot de passe masqué et insère un simple bouton lien. Aucune installation serveur requise.
                </p>
              </div>
            </div>
          </section>

          {/* Section Les 3 Personas */}
          <section className="px-4 sm:px-6 max-w-5xl mx-auto space-y-8 sm:space-y-10">
            <div className="text-center space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100">Une Solution Pensée pour Tous</h2>
              <p className="text-sm sm:text-base text-zinc-300">Étudiants, Enseignants et DSI travaillent en parfaite harmonie.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="p-6 sm:p-7 rounded-2xl border border-zinc-800 bg-zinc-950/70 space-y-3">
                <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">Pour l'Étudiant</span>
                <h4 className="text-base sm:text-lg font-bold text-zinc-100">Installation Sans Droits Admin</h4>
                <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                  S'installe en 1 clic dans le profil utilisateur Windows ou par glisser-déposer sur Mac. Test à froid la veille pour être serein le jour J.
                </p>
              </div>

              <div className="p-6 sm:p-7 rounded-2xl border border-zinc-800 bg-zinc-950/70 space-y-3">
                <div className="flex items-center gap-2">
                  <MoodleLogo size={15} />
                  <span className="text-xs font-mono font-bold text-orange-400 uppercase tracking-wider">Pour l'Enseignant</span>
                </div>
                <h4 className="text-base sm:text-lg font-bold text-zinc-100">Générateur Moodle Intégré</h4>
                <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                  Renseignez l'ID du test et copiez le bloc HTML sécurisé. Les étudiants sans AgoraExam ne peuvent pas déverrouiller l'accès.
                </p>
              </div>

              <div className="p-6 sm:p-7 rounded-2xl border border-zinc-800 bg-zinc-950/70 space-y-3">
                <span className="text-xs font-mono font-bold text-purple-400 uppercase tracking-wider">Pour la DSI Campus</span>
                <h4 className="text-base sm:text-lg font-bold text-zinc-100">Déploiement Intune & GPO</h4>
                <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                  Paquets MSI et PKG avec commande silencieuse pour équiper les salles de cours universitaires sans aucune intervention manuelle.
                </p>
              </div>
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

          {/* Grille des plateformes avec vrais logos officiels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            {/* Windows */}
            <div className="p-6 sm:p-7 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4 hover:border-zinc-700 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-base sm:text-lg font-bold text-zinc-100 flex items-center gap-2.5">
                  <WindowsLogo size={22} />
                  Windows 10 & 11 (64-bit)
                </span>
                <span className="rounded bg-emerald-500/10 px-2.5 py-0.5 text-xs font-mono font-semibold text-emerald-400 border border-emerald-500/20">
                  Recommandé
                </span>
              </div>
              <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                Binaire exécutable autonome (.exe). Double-cliquez pour installer et composer sans mot de passe administrateur.
              </p>
              <div className="pt-2 space-y-2">
                <a
                  href="./downloads/AgoraExam-Setup.exe"
                  download="AgoraExam-Setup.exe"
                  className="w-full min-h-[48px] flex items-center justify-center gap-2.5 rounded-xl bg-emerald-500 py-3.5 px-4 text-sm sm:text-base font-semibold text-zinc-950 hover:bg-emerald-400 transition-colors shadow-md shadow-emerald-500/10 active:scale-[0.98]"
                >
                  <WindowsLogo size={18} />
                  <span>Télécharger AgoraExam-Setup.exe (20.7 Mo)</span>
                </a>
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-400">
                  <span>Téléchargement direct local certifié</span>
                  <span>•</span>
                  <a
                    href="https://github.com/fadelilyas01/AgoraExam/releases/tag/v0.1.0"
                    target="_blank"
                    rel="noreferrer"
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
                  macOS (Apple Silicon M1 à M4)
                </span>
                <span className="rounded bg-zinc-800 px-2.5 py-0.5 text-xs font-mono text-zinc-300">
                  ARM64
                </span>
              </div>
              <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                Image disque (.dmg) native pour puces Apple Silicon. Glissez simplement dans le dossier Applications.
              </p>
              <div className="pt-2">
                <a
                  href="https://github.com/fadelilyas01/AgoraExam/releases/latest/download/AgoraExam-aarch64.dmg"
                  className="w-full min-h-[48px] flex items-center justify-center gap-2.5 rounded-xl bg-zinc-100 py-3.5 px-4 text-sm sm:text-base font-semibold text-zinc-950 hover:bg-white transition-colors"
                >
                  <AppleLogo size={18} />
                  <span>Télécharger AgoraExam-aarch64.dmg (12.8 Mo)</span>
                </a>
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
                  macOS (Processeurs Intel)
                </span>
                <span className="rounded bg-zinc-800 px-2.5 py-0.5 text-xs font-mono text-zinc-300">
                  x86_64
                </span>
              </div>
              <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                Image disque pour ordinateurs Apple équipés de processeurs Intel Core.
              </p>
              <div className="pt-2">
                <a
                  href="https://github.com/fadelilyas01/AgoraExam/releases/latest/download/AgoraExam-x64.dmg"
                  className="w-full min-h-[48px] flex items-center justify-center gap-2.5 rounded-xl border border-zinc-700 bg-zinc-800 py-3.5 px-4 text-sm sm:text-base font-semibold text-zinc-200 hover:bg-zinc-700 transition-colors"
                >
                  <AppleLogo size={18} />
                  <span>Télécharger AgoraExam-x64.dmg (13.4 Mo)</span>
                </a>
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
                  Linux (Ubuntu, Debian, Fedora)
                </span>
                <span className="rounded bg-zinc-800 px-2.5 py-0.5 text-xs font-mono text-zinc-300">
                  AppImage
                </span>
              </div>
              <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                Binaire autonome tout-en-un compatible avec toutes les distributions Linux académiques.
              </p>
              <div className="pt-2">
                <a
                  href="https://github.com/fadelilyas01/AgoraExam/releases/latest/download/AgoraExam.AppImage"
                  className="w-full min-h-[48px] flex items-center justify-center gap-2.5 rounded-xl border border-zinc-700 bg-zinc-800 py-3.5 px-4 text-sm sm:text-base font-semibold text-zinc-200 hover:bg-zinc-700 transition-colors"
                >
                  <LinuxLogo size={18} />
                  <span>Télécharger AgoraExam.AppImage (15.1 Mo)</span>
                </a>
              </div>
              <div className="text-xs font-mono text-zinc-400 flex items-center justify-between pt-1">
                <span>chmod +x puis exécuter</span>
                <span>Version 0.1.0</span>
              </div>
            </div>
          </div>

          {/* Guide Rapide Après Téléchargement */}
          <div className="p-6 sm:p-8 rounded-2xl border border-zinc-800 bg-zinc-950/80 space-y-4">
            <h3 className="text-base sm:text-lg font-bold text-zinc-100 flex items-center gap-2.5">
              <CheckCircle2 size={18} className="text-emerald-400" />
              <span>Que faire après le téléchargement ?</span>
            </h3>
            <ol className="list-decimal list-inside text-sm sm:text-base text-zinc-300 space-y-2 leading-relaxed pl-2">
              <li>Installez le fichier téléchargé sur votre machine personnelle.</li>
              <li>Lancez AgoraExam : le diagnostic automatique teste votre webcam et confirme l'écran unique.</li>
              <li>
                Consultez la{" "}
                <button onClick={() => changeTab("docs")} className="text-emerald-400 underline font-semibold">
                  Documentation officielle
                </button>{" "}
                si vous rencontrez le moindre problème d'accès caméra ou de permissions.
              </li>
            </ol>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ONGLET 3 : PORTAIL DE DOCUMENTATION RESPONSIVE                            */}
      {/* ========================================================================= */}
      {activeTab === "docs" && (
        <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)] w-full relative">
          {/* BARRE MOBILE STICKY DE SÉLECTION DU CHAPITRE (< lg) */}
          <div className="lg:hidden sticky top-16 z-30 flex items-center justify-between border-b border-zinc-800 bg-zinc-950/95 px-4 py-3 backdrop-blur-md">
            <div className="flex items-center gap-2 truncate pr-2">
              <BookOpen size={16} className="text-emerald-400 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-semibold text-zinc-200 truncate">
                {getActiveDocTitle()}
              </span>
            </div>

            <button
              onClick={() => setMobileDocsDrawerOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-zinc-800 transition-colors flex-shrink-0"
            >
              <span>Sommaire (11)</span>
              <ChevronDown size={14} />
            </button>
          </div>

          {/* TIROIR MODAL SOMMAIRE MOBILE (< lg) */}
          {mobileDocsDrawerOpen && (
            <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-sm lg:hidden animate-in fade-in duration-150">
              <div
                className="fixed inset-0"
                onClick={() => setMobileDocsDrawerOpen(false)}
              />
              <div className="relative z-10 max-h-[85vh] rounded-t-3xl border-t border-zinc-800 bg-zinc-950 p-6 overflow-y-auto space-y-6 shadow-2xl">
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
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 pl-9 pr-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-emerald-500/50 focus:outline-none"
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
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 pl-9 pr-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-emerald-500/50 focus:outline-none transition-colors"
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
                        <Server size={18} />
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-zinc-100">Kill Switch Moodle</h3>
                      <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                        Règle des 3 avertissements avec tolérance 4s. Au 3ème strike, soumission et scellement automatique de la tentative sur Moodle via l'API Web Services.
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
                        href="./downloads/AgoraExam-Setup.exe"
                        download="AgoraExam-Setup.exe"
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
                          Image disque (.dmg) pour les modèles Mac avec processeur Intel Core.
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

                  {/* Note sur le binaire local */}
                  <div className="p-5 sm:p-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 space-y-2.5">
                    <div className="flex items-center gap-2 text-sm font-bold text-emerald-400">
                      <CheckCircle2 size={18} />
                      <span>Binaire Windows compilé disponible immédiatement en local</span>
                    </div>
                    <p className="text-sm sm:text-base text-zinc-200 leading-relaxed">
                      L'exécutable autonome est d'ores et déjà généré sur votre ordinateur dans :<br />
                      <code className="text-xs sm:text-sm font-mono bg-zinc-950 border border-zinc-800 px-3 py-2 rounded-xl text-emerald-300 block mt-2 overflow-x-auto">
                        C:\Projet\AgoraExam\release-bin\AgoraExam.exe
                      </code>
                    </p>
                  </div>
                </article>
              )}

              {/* ================================================================= */}
              {/* 3. VISION LOCALE & RGPD (NON-HYPE)                                */}
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
              {/* 5. RÈGLE DES 3 STRIKES & 4s                                      */}
              {/* ================================================================= */}
              {activeDocSection === "regle-strikes" && (
                <article className="space-y-8 animate-in fade-in duration-200">
                  <div className="border-b border-zinc-800 pb-6 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-mono font-semibold text-amber-400 border border-amber-500/20">
                        Arbitrage & Tolérance
                      </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-zinc-100">
                      Règle des 3 Strikes & Tolérance 4s
                    </h1>
                    <p className="text-base sm:text-lg text-zinc-300 leading-relaxed">
                      Le protocole impartial de gestion des incidents et le Kill Switch automatique sur Moodle.
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

                  {/* Les 3 niveaux */}
                  <div className="space-y-4">
                    <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm sm:text-base font-bold text-amber-400">Strike 1 : Premier Avertissement</span>
                        <span className="text-xs font-mono text-zinc-400">Capture photo horodatée</span>
                      </div>
                      <p className="text-sm sm:text-base text-zinc-200 leading-relaxed">
                        Affichage d'un modal bloquant à l'écran : <em>« Attention : votre visage n'est plus détecté (1/3). Au 3ème avertissement, votre tentative sera scellée automatiquement. »</em> L'étudiant clique pour acquitter et poursuivre son épreuve.
                      </p>
                    </div>

                    <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm sm:text-base font-bold text-orange-400">Strike 2 : Dernier Avertissement</span>
                        <span className="text-xs font-mono text-zinc-400">Capture photo horodatée</span>
                      </div>
                      <p className="text-sm sm:text-base text-zinc-200 leading-relaxed">
                        Alerte renforcée avec rappel que la prochaine infraction clôturera définitivement le test sans possibilité de réouverture.
                      </p>
                    </div>

                    <div className="p-6 rounded-2xl border border-rose-500/40 bg-rose-500/10 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm sm:text-base font-bold text-rose-400">Strike 3 : Kill Switch Moodle & Expulsion</span>
                        <span className="text-xs font-mono text-rose-300 font-bold">Exclusion immédiate</span>
                      </div>
                      <p className="text-sm sm:text-base text-zinc-200 leading-relaxed">
                        Le backend Rust envoie immédiatement une requête sécurisée vers l'API Moodle (<code className="font-mono text-rose-300">mod_quiz_process_attempt</code> avec le paramètre <code className="font-mono text-rose-300">finishattempt = 1</code>). La tentative est soumise, les réponses sont scellées, et l'application affiche l'écran de clôture définitive.
                      </p>
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
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm font-mono text-zinc-100 focus:border-emerald-500/50 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs sm:text-sm font-semibold text-zinc-300 block mb-1.5">Adresse Moodle (URL)</label>
                      <input
                        type="text"
                        value={moodleUrl}
                        onChange={(e) => setMoodleUrl(e.target.value)}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-100 focus:border-emerald-500/50 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs sm:text-sm font-semibold text-zinc-300 block mb-1.5">Intitulé de l'Épreuve</label>
                      <input
                        type="text"
                        value={examName}
                        onChange={(e) => setExamName(e.target.value)}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-100 focus:border-emerald-500/50 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Prévisualisation */}
                  <div className="space-y-3">
                    <span className="text-xs sm:text-sm font-mono font-bold text-zinc-400 uppercase tracking-wider block">
                      Aperçu tel qu'affiché pour l'étudiant dans Moodle :
                    </span>
                    <div
                      className="p-6 rounded-2xl border border-zinc-800 bg-zinc-950/80"
                      dangerouslySetInnerHTML={{ __html: generatedMoodleHtml }}
                    />
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
                          ref={sandboxVideoRef}
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
      <footer className="border-t border-zinc-800/80 bg-zinc-950 px-4 sm:px-6 py-8 sm:py-10 text-center text-xs sm:text-sm text-zinc-400 space-y-3">
        <div className="flex items-center justify-center gap-2 text-zinc-300">
          <AgoraExamLogo size={18} />
          <span className="font-semibold text-zinc-200">AgoraExam</span>
          <span>•</span>
          <span>Logiciel Libre sous licence MIT</span>
          <span>•</span>
          <span>Conçu pour l'enseignement supérieur et Moodle</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs sm:text-sm text-zinc-400">
          <button onClick={() => changeTab("home")} className="hover:text-white transition-colors">Accueil</button>
          <span>•</span>
          <button onClick={() => changeTab("download")} className="hover:text-white transition-colors">Téléchargements</button>
          <span>•</span>
          <button onClick={() => changeTab("docs")} className="hover:text-white transition-colors">Documentation</button>
          <span>•</span>
          <a
            href="https://github.com/fadelilyas01/AgoraExam"
            target="_blank"
            rel="noreferrer"
            className="hover:text-white transition-colors inline-flex items-center gap-1.5"
          >
            <GitHubLogo size={14} />
            <span>GitHub</span>
          </a>
        </div>
      </footer>
    </div>
  );
}
