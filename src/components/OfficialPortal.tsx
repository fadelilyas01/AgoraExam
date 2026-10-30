import { useState, useEffect, useRef } from "react";
import {
  Shield,
  Download,
  BookOpen,
  Monitor,
  Camera,
  Cpu,
  Lock,
  ExternalLink,
  Check,
  Copy,
  Search,
  Sparkles,
  AlertTriangle,
  GraduationCap,
  Server,
  Code2,
  CheckCircle2,
} from "lucide-react";

interface OfficialPortalProps {
  initialTab?: "home" | "docs" | "download";
  onLaunchApp?: () => void;
}

type DocSectionId =
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

export function OfficialPortal({ initialTab = "home", onLaunchApp }: OfficialPortalProps) {
  const [activeTab, setActiveTab] = useState<"home" | "docs" | "download">(initialTab);
  const [activeDocSection, setActiveDocSection] = useState<DocSectionId>("intro");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

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
          ? "Permission refusée. Veuillez autoriser la caméra dans votre navigateur."
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

  const generatedMoodleHtml = `<!-- Bloc AgoraExam pour description de quiz Moodle -->
<div style="background:#09090b; border:1px solid #27272a; border-radius:12px; padding:20px; text-align:center; max-width:540px; margin:16px auto; font-family:sans-serif; color:#f4f4f5;">
  <div style="display:inline-flex; align-items:center; gap:8px; margin-bottom:8px;">
    <span style="background:#10b981; width:8px; height:8px; border-radius:50%; display:inline-block;"></span>
    <span style="font-size:12px; text-transform:uppercase; letter-spacing:0.05em; color:#10b981; font-weight:600;">Examen Télésurveillé</span>
  </div>
  <h3 style="margin:0 0 8px 0; font-size:16px; color:#fff;">${examName}</h3>
  <p style="font-size:13px; color:#a1a1aa; margin:0 0 16px 0; line-height:1.5;">
    Cet examen exige l'utilisation d'<strong>AgoraExam</strong>. Débranchez tout écran externe et fermez Discord, Teams ou Zoom avant d'ouvrir le test.
  </p>
  <a href="agoraexam://launch?quizid=${moodleQuizId}&host=${encodeURIComponent(moodleUrl)}" 
     style="display:inline-block; background:#10b981; color:#09090b; font-weight:600; font-size:13px; padding:10px 22px; border-radius:8px; text-decoration:none; box-shadow:0 2px 8px rgba(16,185,129,0.2);">
    🚀 Lancer l'Épreuve dans AgoraExam
  </a>
</div>`;

  return (
    <div className="min-h-screen w-full bg-zinc-950 text-zinc-100 font-sans antialiased selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* 1. BARRE DE NAVIGATION PRINCIPALE (HEADER OFFICIEL) */}
      <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-zinc-800/80 bg-zinc-950/80 px-6 lg:px-12 backdrop-blur-md">
        <div className="flex items-center gap-8">
          {/* Logo Brand */}
          <button
            onClick={() => changeTab("home")}
            className="flex items-center gap-3 text-left group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-emerald-400 group-hover:border-emerald-500/50 transition-colors shadow-sm">
              <Shield size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-tight text-zinc-100">AgoraExam</span>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.2 text-[10px] font-mono font-medium text-emerald-400 border border-emerald-500/20">
                  Open-Source
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 font-mono">Navigateur d'Examen Sécurisé Moodle</p>
            </div>
          </button>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => changeTab("home")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === "home"
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              Accueil
            </button>
            <button
              onClick={() => changeTab("download")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === "download"
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              Télécharger
            </button>
            <button
              onClick={() => changeTab("docs")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === "docs"
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              Documentation
            </button>
          </nav>
        </div>

        {/* Actions Droite */}
        <div className="flex items-center gap-3">
          <a
            href="https://github.com/fadelilyas01/AgoraExam"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <Code2 size={14} />
            <span>GitHub</span>
            <ExternalLink size={12} className="text-zinc-500" />
          </a>

          {onLaunchApp && (
            <button
              onClick={onLaunchApp}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 hover:text-white transition-colors"
            >
              <span>Ouvrir l'App Kiosk</span>
            </button>
          )}

          <button
            onClick={() => changeTab("download")}
            className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-emerald-400 transition-all shadow-md shadow-emerald-500/10 active:scale-[0.98]"
          >
            <Download size={14} />
            <span className="font-semibold">Télécharger</span>
          </button>
        </div>
      </header>

      {/* 2. CONTENU SELON L'ONGLET ACTIF */}

      {/* ========================================================================= */}
      {/* ONGLET 1 : PAGE D'ACCUEIL OFFICIELLE (LANDING PAGE SAAS SOBRE & ÉLÉGANTE) */}
      {/* ========================================================================= */}
      {activeTab === "home" && (
        <div className="space-y-24 pb-24">
          {/* Hero Section */}
          <section className="relative overflow-hidden pt-20 lg:pt-28 text-center px-6 max-w-5xl mx-auto space-y-8">
            {/* Pill Notification */}
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-medium text-emerald-400">
              <Sparkles size={13} />
              <span>Version 0.1.0 Stable Disponible — Alternative Open-Source à Respondus</span>
            </div>

            {/* Titre & Sous-titre */}
            <div className="space-y-4 max-w-4xl mx-auto">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-zinc-100 leading-[1.1]">
                Le Navigateur d'Examen Sécurisé &{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                  Télésurveillance Éthique
                </span>{" "}
                pour Moodle
              </h1>
              <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                Verrouillage système impénétrable (Kiosk Mode) et surveillance faciale par intelligence artificielle
                exécutée <strong>100% sur l'ordinateur de l'étudiant</strong>. Zéro flux vidéo dans le cloud. Conforme RGPD.
              </p>
            </div>

            {/* Call To Actions de Téléchargement */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <button
                onClick={() => changeTab("download")}
                className="w-full sm:w-auto flex items-center justify-center gap-2.5 rounded-xl bg-emerald-500 px-6 py-3.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
              >
                <Download size={17} />
                <span>
                  Télécharger pour {detectedOs === "mac" ? "macOS (.dmg)" : detectedOs === "linux" ? "Linux (.AppImage)" : "Windows (.exe)"}
                </span>
              </button>

              <button
                onClick={() => changeTab("docs")}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 px-6 py-3.5 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 hover:text-white transition-colors"
              >
                <BookOpen size={16} className="text-zinc-400" />
                <span>Consulter la Documentation</span>
              </button>
            </div>

            {/* Micro-labels rassurants */}
            <div className="pt-4 flex items-center justify-center gap-6 text-xs text-zinc-500 font-mono">
              <span className="flex items-center gap-1.5">
                <Check size={14} className="text-emerald-500" /> &lt; 15 Mo
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Check size={14} className="text-emerald-500" /> Zéro Inscription
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Check size={14} className="text-emerald-500" /> 100% Open-Source MIT
              </span>
            </div>

            {/* Mockup / Aperçu Réaliste de l'Interface */}
            <div className="pt-8">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-2 shadow-2xl ring-1 ring-zinc-800/80 max-w-4xl mx-auto overflow-hidden">
                <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-4 text-left space-y-3">
                  {/* Fausse barre de titre */}
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-rose-500/60" />
                      <div className="h-3 w-3 rounded-full bg-amber-500/60" />
                      <div className="h-3 w-3 rounded-full bg-emerald-500/60" />
                      <span className="ml-2 text-xs font-mono text-zinc-400">
                        AgoraExam - Session Verrouillée [Kiosk Mode]
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Inférence Locale MediaPipe : 30 FPS
                    </div>
                  </div>

                  {/* Contenu simulé */}
                  <div className="grid grid-cols-3 gap-4 pt-2">
                    <div className="col-span-2 p-4 rounded-lg bg-zinc-950/80 border border-zinc-800/80 space-y-3">
                      <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                        <span>Épreuve : Algorithmique Avancée</span>
                        <span className="text-emerald-400">Question 3 / 8</span>
                      </div>
                      <p className="text-xs text-zinc-200">
                        Implémentation d'une table de hachage avec adressage ouvert et détection de collisions...
                      </p>
                      <div className="h-16 rounded bg-zinc-900/70 border border-zinc-800 p-2 font-mono text-[11px] text-zinc-400">
                        fn hash_search(key: &amp;str) -&gt; Option&lt;u32&gt; &#123; ... &#125;
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-zinc-950/80 border border-zinc-800/80 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5">
                          <Camera size={13} className="text-emerald-400" />
                          <span>Webcam PiP</span>
                        </div>
                        <div className="aspect-video w-full rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[10px] text-zinc-500 font-mono">
                          1 Visage • Cadrage OK
                        </div>
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono pt-2 border-t border-zinc-800">
                        Strikes : 0 / 3 • Conforme
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Grille Bento des Fonctionnalités Clés */}
          <section className="px-6 max-w-6xl mx-auto space-y-12">
            <div className="text-center space-y-3 max-w-2xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
                L'Excellence Technique au Service de la Justice Académique
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400">
                Conçu pour éliminer la triche sans transformer l'ordinateur personnel de l'étudiant en mouchard intrusif.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Carte 1 */}
              <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-emerald-400 border border-zinc-700/60">
                  <Lock size={20} />
                </div>
                <h3 className="text-sm font-semibold text-zinc-100">Verrouillage Système Absolu</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Plein écran forcé, neutralisation d'Alt+Tab, Alt+F4, Cmd+Tab, captures d'écran, masquage du Dock et de la barre des tâches.
                </p>
              </div>

              {/* Carte 2 */}
              <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-blue-400 border border-zinc-700/60">
                  <Monitor size={20} />
                </div>
                <h3 className="text-sm font-semibold text-zinc-100">Anti-Multi-Écran Matériel</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Interrogation directe du système d'exploitation en Rust : impossible de lancer l'examen si un câble HDMI, DisplayPort ou AirPlay est actif.
                </p>
              </div>

              {/* Carte 3 */}
              <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-emerald-400 border border-zinc-700/60">
                  <Cpu size={20} />
                </div>
                <h3 className="text-sm font-semibold text-zinc-100">IA Éthique & Locale (Edge AI)</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Inférence MediaPipe WebAssembly exécutée dans la RAM de l'étudiant. Aucun flux vidéo n'est envoyé vers des serveurs distants.
                </p>
              </div>

              {/* Carte 4 */}
              <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-amber-400 border border-zinc-700/60">
                  <AlertTriangle size={20} />
                </div>
                <h3 className="text-sm font-semibold text-zinc-100">3 Strikes avec Tolérance 4s</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Pas de pénalité arbitraire sur un clignement d'yeux ou un éternuement. Au 3ème avertissement avéré, soumission automatique sur Moodle.
                </p>
              </div>

              {/* Carte 5 */}
              <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-purple-400 border border-zinc-700/60">
                  <Camera size={20} />
                </div>
                <h3 className="text-sm font-semibold text-zinc-100">Preuves Photographiques Scellées</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Seules les infractions avérées enregistrent une photo locale horodatée scellée avec son empreinte SHA-256 pour les jurys.
                </p>
              </div>

              {/* Carte 6 */}
              <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-teal-400 border border-zinc-700/60">
                  <GraduationCap size={20} />
                </div>
                <h3 className="text-sm font-semibold text-zinc-100">Zéro Plugin Moodle Obligatoire</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  L'enseignant configure son test avec un mot de passe masqué et insère un simple bouton lien. Aucune installation serveur requise.
                </p>
              </div>
            </div>
          </section>

          {/* Section Les 3 Personas */}
          <section className="px-6 max-w-5xl mx-auto space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-zinc-100">Une Solution Pensée pour Tous</h2>
              <p className="text-xs text-zinc-400">Étudiants, Enseignants et DSI travaillent en harmonie.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-950/70 space-y-3">
                <span className="text-xs font-mono font-bold text-emerald-400">POUR L'ÉTUDIANT</span>
                <h4 className="text-sm font-semibold text-zinc-200">Installation Sans Droits Admin</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  S'installe en 1 clic dans le profil utilisateur Windows ou par glisser-déposer sur Mac. Test à froid la veille pour être serein le jour J.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-950/70 space-y-3">
                <span className="text-xs font-mono font-bold text-blue-400">POUR L'ENSEIGNANT</span>
                <h4 className="text-sm font-semibold text-zinc-200">Générateur Moodle Intégré</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Renseignez l'ID du test et copiez le bloc HTML sécurisé. Les étudiants non équipés ne peuvent pas accéder au quiz.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-950/70 space-y-3">
                <span className="text-xs font-mono font-bold text-purple-400">POUR LA DSI CAMPUS</span>
                <h4 className="text-sm font-semibold text-zinc-200">Déploiement Intune & GPO</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Paquets MSI et PKG avec commande silencieuse pour équiper les salles de cours universitaires sans aucune intervention manuelle.
                </p>
              </div>
            </div>
          </section>

          {/* Bannière Call To Action Finale */}
          <section className="px-6 max-w-4xl mx-auto">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-8 sm:p-12 text-center space-y-6 shadow-2xl">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-100">
                Prêt à sécuriser vos prochains examens universitaires ?
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto">
                Téléchargez AgoraExam gratuitement dès aujourd'hui ou consultez notre documentation pour intégrer vos cours Moodle.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => changeTab("download")}
                  className="rounded-xl bg-emerald-500 px-6 py-3 text-xs font-semibold text-zinc-950 hover:bg-emerald-400 transition-all shadow-md shadow-emerald-500/10"
                >
                  Télécharger AgoraExam
                </button>
                <button
                  onClick={() => changeTab("docs")}
                  className="rounded-xl border border-zinc-700 bg-zinc-800 px-6 py-3 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition-colors"
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
        <div className="max-w-4xl mx-auto px-6 py-12 space-y-10 animate-in fade-in duration-200">
          <div className="text-center space-y-3 border-b border-zinc-800 pb-8">
            <span className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider">
              Dernière Version Stable
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-100">
              Télécharger AgoraExam v0.1.0
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto">
              Choisissez l'installateur correspondant à votre ordinateur. Tous les exécutables sont autonomes (&lt; 15 Mo) et ne requièrent aucun droit administrateur sous Windows.
            </p>
          </div>

          {/* Grille des plateformes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Windows */}
            <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-100 flex items-center gap-2">
                  <Monitor size={16} className="text-blue-400" />
                  Windows 10 & 11 (64-bit)
                </span>
                <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-400 border border-emerald-500/20">
                  Le plus téléchargé
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Installateur automatique par utilisateur. Double-cliquez pour installer sans mot de passe admin.
              </p>
              <div className="pt-2">
                <a
                  href="https://github.com/fadelilyas01/AgoraExam/releases/latest/download/AgoraExam-Setup.exe"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-xs font-semibold text-zinc-950 hover:bg-emerald-400 transition-colors"
                >
                  <Download size={14} />
                  <span>Télécharger AgoraExam-Setup.exe (14.2 Mo)</span>
                </a>
              </div>
              <div className="text-[10px] font-mono text-zinc-500 flex items-center justify-between">
                <span>SHA-256 : a8f9c2...7e1b</span>
                <span>Version 0.1.0</span>
              </div>
            </div>

            {/* macOS Apple Silicon */}
            <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-100 flex items-center gap-2">
                  <Cpu size={16} className="text-emerald-400" />
                  macOS (Apple Silicon M1/M2/M3/M4)
                </span>
                <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-mono text-zinc-400">
                  ARM64
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Image disque native optimisée pour les Mac modernes. Glissez l'application dans Applications.
              </p>
              <div className="pt-2">
                <a
                  href="https://github.com/fadelilyas01/AgoraExam/releases/latest/download/AgoraExam-aarch64.dmg"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-zinc-100 py-3 text-xs font-semibold text-zinc-950 hover:bg-white transition-colors"
                >
                  <Download size={14} />
                  <span>Télécharger AgoraExam-aarch64.dmg (12.8 Mo)</span>
                </a>
              </div>
              <div className="text-[10px] font-mono text-zinc-500 flex items-center justify-between">
                <span>macOS 11.0 Big Sur minimum</span>
                <span>Version 0.1.0</span>
              </div>
            </div>

            {/* macOS Intel */}
            <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-100 flex items-center gap-2">
                  <Monitor size={16} className="text-zinc-400" />
                  macOS (Processeurs Intel)
                </span>
                <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-mono text-zinc-400">
                  x86_64
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Image disque pour les ordinateurs Mac équipés de processeurs Intel.
              </p>
              <div className="pt-2">
                <a
                  href="https://github.com/fadelilyas01/AgoraExam/releases/latest/download/AgoraExam-x64.dmg"
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 py-3 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition-colors"
                >
                  <Download size={14} />
                  <span>Télécharger AgoraExam-x64.dmg (13.4 Mo)</span>
                </a>
              </div>
              <div className="text-[10px] font-mono text-zinc-500 flex items-center justify-between">
                <span>macOS 10.15 Catalina minimum</span>
                <span>Version 0.1.0</span>
              </div>
            </div>

            {/* Linux */}
            <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-100 flex items-center gap-2">
                  <Server size={16} className="text-amber-400" />
                  Linux (Ubuntu, Debian, Fedora)
                </span>
                <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-mono text-zinc-400">
                  AppImage
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Binaire autonome tout-en-un compatible avec toutes les distributions Linux académiques.
              </p>
              <div className="pt-2">
                <a
                  href="https://github.com/fadelilyas01/AgoraExam/releases/latest/download/AgoraExam.AppImage"
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 py-3 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition-colors"
                >
                  <Download size={14} />
                  <span>Télécharger AgoraExam.AppImage (15.1 Mo)</span>
                </a>
              </div>
              <div className="text-[10px] font-mono text-zinc-500 flex items-center justify-between">
                <span>chmod +x puis exécuter</span>
                <span>Version 0.1.0</span>
              </div>
            </div>
          </div>

          {/* Guide Rapide Après Téléchargement */}
          <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-950/80 space-y-3">
            <h3 className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-400" />
              <span>Que faire après le téléchargement ?</span>
            </h3>
            <ol className="list-decimal list-inside text-xs text-zinc-400 space-y-1.5 leading-relaxed">
              <li>Installez le fichier téléchargé sur votre machine personnelle.</li>
              <li>Lancez AgoraExam : le diagnostic automatique teste votre webcam et confirme l'écran unique.</li>
              <li>Consultez la <button onClick={() => changeTab("docs")} className="text-emerald-400 underline">Documentation</button> si vous rencontrez le moindre problème de caméra.</li>
            </ol>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ONGLET 3 : PORTAIL DE DOCUMENTATION INTERACTIVE (FRAMEWORK DOCS)          */}
      {/* ========================================================================= */}
      {activeTab === "docs" && (
        <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden">
          {/* Sidebar Doc */}
          <aside className="w-72 border-r border-zinc-800/80 bg-zinc-950/90 p-5 overflow-y-auto flex-shrink-0">
            {/* Recherche rapide */}
            <div className="relative mb-5">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Filtrer les guides..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900/80 pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none"
              />
            </div>

            <div className="space-y-6">
              {[
                {
                  group: "Bien Démarrer",
                  items: [
                    { id: "intro", title: "Présentation Générale" },
                    { id: "edge-ai", title: "Architecture & RGPD", badge: "Éthique" },
                    { id: "telechargement", title: "Matrice Téléchargements" },
                  ],
                },
                {
                  group: "Guide Étudiant",
                  items: [
                    { id: "etudiant-guide", title: "Déroulement de l'Examen" },
                    { id: "regle-strikes", title: "Règle 3 Strikes & 4s", badge: "Important" },
                    { id: "depannage-camera", title: "Dépannage Caméra" },
                  ],
                },
                {
                  group: "Guide Enseignant",
                  items: [
                    { id: "enseignant-guide", title: "Configurer Moodle" },
                    { id: "generateur-moodle", title: "Générateur Bouton Moodle", badge: "Interactif" },
                  ],
                },
                {
                  group: "DSI & Administrateurs",
                  items: [
                    { id: "dsi-deploiement", title: "Déploiement Intune/GPO" },
                    { id: "dsi-securite", title: "Pare-feu & Signature" },
                  ],
                },
                {
                  group: "Banc d'Essai",
                  items: [
                    { id: "bac-a-sable", title: "Testeur Caméra Web Live", badge: "Live" },
                  ],
                },
              ].map((grp) => {
                const filtered = grp.items.filter((it) =>
                  it.title.toLowerCase().includes(searchQuery.toLowerCase())
                );
                if (filtered.length === 0) return null;

                return (
                  <div key={grp.group} className="space-y-1">
                    <h4 className="px-2.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                      {grp.group}
                    </h4>
                    <div className="space-y-0.5 pt-1">
                      {filtered.map((it) => (
                        <button
                          key={it.id}
                          onClick={() => setActiveDocSection(it.id as DocSectionId)}
                          className={`w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all text-left ${
                            activeDocSection === it.id
                              ? "bg-zinc-800 text-emerald-400 shadow-sm"
                              : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                          }`}
                        >
                          <span className="truncate">{it.title}</span>
                          {it.badge && (
                            <span
                              className={`rounded px-1.5 py-0.2 text-[9px] font-semibold uppercase ${
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

          {/* Main Article Content */}
          <main className="flex-1 overflow-y-auto bg-zinc-900/20 p-8 lg:p-12">
            <div className="max-w-3xl mx-auto space-y-10">
              {activeDocSection === "intro" && (
                <article className="space-y-6">
                  <div className="border-b border-zinc-800 pb-5">
                    <h1 className="text-2xl font-bold text-zinc-100">Présentation d'AgoraExam</h1>
                    <p className="text-xs text-zinc-400 mt-1">Architecture, cas d'usage et principes fondateurs.</p>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    AgoraExam transforme n'importe quel ordinateur personnel d'étudiant en un terminal d'examen verrouillé, garantissant une intégrité totale lors des épreuves Moodle sans recourir à des serveurs de surveillance cloud intrusifs.
                  </p>
                </article>
              )}

              {activeDocSection === "edge-ai" && (
                <article className="space-y-6">
                  <div className="border-b border-zinc-800 pb-5">
                    <h1 className="text-2xl font-bold text-zinc-100">Inférence 100% Locale & RGPD</h1>
                    <p className="text-xs text-zinc-400 mt-1">Pourquoi aucun flux vidéo n'est envoyé sur internet.</p>
                  </div>
                  <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 text-xs text-zinc-300 space-y-2">
                    <strong className="text-emerald-400 block font-semibold">Edge AI WebAssembly</strong>
                    <p className="text-zinc-400 leading-relaxed">
                      L'analyse faciale est effectuée en direct dans la mémoire vive de l'ordinateur de l'étudiant via les modèles optimisés Google MediaPipe. Les images sont détruites après inférence.
                    </p>
                  </div>
                </article>
              )}

              {activeDocSection === "regle-strikes" && (
                <article className="space-y-6">
                  <div className="border-b border-zinc-800 pb-5">
                    <h1 className="text-2xl font-bold text-zinc-100">Règle des 3 Strikes & Tolérance 4s</h1>
                    <p className="text-xs text-zinc-400 mt-1">Le protocole de gestion des incidents de surveillance.</p>
                  </div>
                  <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-zinc-300 space-y-2">
                    <strong className="text-amber-400 block font-semibold">Tolérance 4 secondes</strong>
                    <p className="text-zinc-300 leading-relaxed">
                      Si l'étudiant éternue ou ramasse un stylo, aucun avertissement n'est déclenché. Le décompte ne s'active que si le visage disparaît plus de 4 secondes complètes.
                    </p>
                  </div>
                </article>
              )}

              {activeDocSection === "depannage-camera" && (
                <article className="space-y-6">
                  <div className="border-b border-zinc-800 pb-5">
                    <h1 className="text-2xl font-bold text-zinc-100">Dépannage Caméra & Micro</h1>
                    <p className="text-xs text-zinc-400 mt-1">Résoudre les conflits d'applications tierces.</p>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Fermez complètement Discord, Zoom, Teams et WhatsApp. Sous Windows, une seule application peut accéder au capteur de la caméra à la fois.
                  </p>
                </article>
              )}

              {activeDocSection === "generateur-moodle" && (
                <article className="space-y-6">
                  <div className="border-b border-zinc-800 pb-5">
                    <h1 className="text-2xl font-bold text-zinc-100">Générateur de Bouton Moodle</h1>
                    <p className="text-xs text-zinc-400 mt-1">Créez le bloc HTML officiel à intégrer dans votre Quiz.</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-300 block mb-1">ID du Quiz Moodle</label>
                      <input
                        type="text"
                        value={moodleQuizId}
                        onChange={(e) => setMoodleQuizId(e.target.value)}
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-xs font-mono text-zinc-200"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-300 block mb-1">URL de Moodle</label>
                      <input
                        type="text"
                        value={moodleUrl}
                        onChange={(e) => setMoodleUrl(e.target.value)}
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-xs text-zinc-200"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Nom de l'Épreuve</label>
                      <input
                        type="text"
                        value={examName}
                        onChange={(e) => setExamName(e.target.value)}
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-xs text-zinc-200"
                      />
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
                      Prévisualisation Moodle :
                    </span>
                    <div
                      className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/70"
                      dangerouslySetInnerHTML={{ __html: generatedMoodleHtml }}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-zinc-400 uppercase">Code HTML à copier :</span>
                      <button
                        onClick={() => copyToClipboard(generatedMoodleHtml, "moodle-btn")}
                        className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                      >
                        {copiedSnippet === "moodle-btn" ? <Check size={13} /> : <Copy size={13} />}
                        <span>Copier le Code HTML</span>
                      </button>
                    </div>
                    <pre className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950 text-[11px] font-mono text-zinc-400 overflow-x-auto">
                      {generatedMoodleHtml}
                    </pre>
                  </div>
                </article>
              )}

              {activeDocSection === "bac-a-sable" && (
                <article className="space-y-6">
                  <div className="border-b border-zinc-800 pb-5">
                    <h1 className="text-2xl font-bold text-zinc-100">Banc d'Essai Caméra en Direct</h1>
                    <p className="text-xs text-zinc-400 mt-1">Testez votre matériel avant l'examen officiel.</p>
                  </div>

                  <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-950/80 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-200">Vérification de posture et flux</span>
                      <button
                        onClick={toggleSandboxCamera}
                        className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                          sandboxActive
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            : "bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
                        }`}
                      >
                        {sandboxActive ? "Arrêter le Test" : "Démarrer le Test Caméra"}
                      </button>
                    </div>

                    {sandboxError && (
                      <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300">
                        {sandboxError}
                      </div>
                    )}

                    <div className="aspect-video w-full max-w-md mx-auto rounded-xl overflow-hidden bg-black border border-zinc-800 flex items-center justify-center">
                      {sandboxActive ? (
                        <video ref={sandboxVideoRef} autoPlay playsInline muted className="h-full w-full object-cover -scale-x-100" />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-zinc-600 gap-1.5 p-4 text-center">
                          <Camera size={28} />
                          <span className="text-xs">Caméra en attente de test</span>
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

      {/* 3. FOOTER GLOBAL */}
      <footer className="border-t border-zinc-800/80 bg-zinc-950 px-6 py-8 text-center text-xs text-zinc-500 space-y-2">
        <p>AgoraExam • Logiciel Libre sous licence MIT • Conçu pour l'enseignement supérieur et Moodle</p>
        <div className="flex items-center justify-center gap-4 text-[11px] text-zinc-400">
          <button onClick={() => changeTab("home")} className="hover:underline">Accueil</button>
          <span>•</span>
          <button onClick={() => changeTab("download")} className="hover:underline">Téléchargements</button>
          <span>•</span>
          <button onClick={() => changeTab("docs")} className="hover:underline">Documentation</button>
          <span>•</span>
          <a href="https://github.com/fadelilyas01/AgoraExam" target="_blank" rel="noreferrer" className="hover:underline">GitHub</a>
        </div>
      </footer>
    </div>
  );
}
