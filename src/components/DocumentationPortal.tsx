import { useState, useRef, useEffect } from "react";
import {
  BookOpen,
  Search,
  Monitor,
  Camera,
  Server,
  Code2,
  Check,
  Copy,
  ExternalLink,
  AlertTriangle,
  Play,
  VideoOff,
  Cpu,
  Lock,
  ArrowLeft,
  GraduationCap,
  Sparkles,
} from "lucide-react";

interface DocumentationPortalProps {
  onClose?: () => void;
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

interface NavItem {
  id: DocSectionId;
  title: string;
  badge?: string;
}

interface NavGroup {
  groupTitle: string;
  items: NavItem[];
}

export function DocumentationPortal({ onClose }: DocumentationPortalProps) {
  const [activeSection, setActiveSection] = useState<DocSectionId>("intro");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  // États pour le générateur interactif Moodle
  const [moodleQuizId, setMoodleQuizId] = useState<string>("142");
  const [moodleUrl, setMoodleUrl] = useState<string>("https://moodle.universite.fr");
  const [examName, setExamName] = useState<string>("Algorithmique Avancée");

  // États pour le Bac à Sable Caméra dans la Doc
  const [sandboxStream, setSandboxStream] = useState<MediaStream | null>(null);
  const [sandboxActive, setSandboxActive] = useState<boolean>(false);
  const [sandboxError, setSandboxError] = useState<string | null>(null);
  const sandboxVideoRef = useRef<HTMLVideoElement | null>(null);

  // Copier dans le presse-papier avec confirmation visuelle
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  // Gestion du bac à sable vidéo
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
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setSandboxError("Permission refusée. Veuillez autoriser la caméra dans la barre d'adresse.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setSandboxError("Aucune webcam détectée sur cette machine.");
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        setSandboxError("Webcam occupée par un autre logiciel (Zoom, Teams, Discord).");
      } else {
        setSandboxError(`Erreur d'accès caméra : ${err.message || err.name}`);
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

  // Arborescence de la documentation
  const navGroups: NavGroup[] = [
    {
      groupTitle: "Bien Démarrer",
      items: [
        { id: "intro", title: "Présentation d'AgoraExam" },
        { id: "edge-ai", title: "Architecture & IA Éthique (RGPD)", badge: "Éthique" },
        { id: "telechargement", title: "Téléchargements & Versions" },
      ],
    },
    {
      groupTitle: "Guide Étudiant",
      items: [
        { id: "etudiant-guide", title: "Déroulement de l'Épreuve" },
        { id: "regle-strikes", title: "Règle des 3 Strikes & 4s", badge: "Important" },
        { id: "depannage-camera", title: "Dépannage Caméra & Micro" },
      ],
    },
    {
      groupTitle: "Guide Enseignant",
      items: [
        { id: "enseignant-guide", title: "Intégration Moodle en 2 min" },
        { id: "generateur-moodle", title: "Générateur de Bouton Moodle", badge: "Interactif" },
      ],
    },
    {
      groupTitle: "DSI & Déploiement Campus",
      items: [
        { id: "dsi-deploiement", title: "Déploiement Intune & GPO" },
        { id: "dsi-securite", title: "Signature de Code & Ports" },
      ],
    },
    {
      groupTitle: "Laboratoire de Test",
      items: [
        { id: "bac-a-sable", title: "Diagnostic Caméra en Ligne", badge: "Live" },
      ],
    },
  ];

  // Code HTML généré pour Moodle
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
    <div className="flex h-screen w-screen flex-col bg-zinc-950 text-zinc-100 font-sans antialiased overflow-hidden">
      {/* 1. TOP HEADER / NAVBAR TYPE FRAMEWORK DOCS */}
      <header className="flex h-14 items-center justify-between border-b border-zinc-800/80 bg-zinc-900/90 px-6 backdrop-blur z-20">
        <div className="flex items-center gap-4">
          {onClose && (
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Retour à l'App</span>
            </button>
          )}

          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <BookOpen size={18} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-tight text-zinc-100">
                AgoraExam <span className="font-normal text-zinc-400">Documentation</span>
              </span>
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-mono text-zinc-400 border border-zinc-700/60">
                v0.1.0
              </span>
            </div>
          </div>
        </div>

        {/* Barre de recherche intégrée */}
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500"
            />
            <input
              type="text"
              placeholder="Rechercher dans la documentation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950/70 pl-8 pr-8 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-500/50 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded bg-zinc-900 px-1.5 py-0.5 text-[9px] font-mono text-zinc-500 border border-zinc-800">
              ⌘K
            </span>
          </div>

          <a
            href="https://github.com/votre-orga/AgoraExam"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <span>GitHub</span>
            <ExternalLink size={12} className="text-zinc-500" />
          </a>
        </div>
      </header>

      {/* 2. BODY : SIDEBAR NAVIGATION + ARTICLE DE DOCUMENTATION */}
      <div className="flex flex-1 overflow-hidden">
        {/* Volet de Navigation Latéral (Sidebar) */}
        <aside className="w-72 border-r border-zinc-800/80 bg-zinc-950/80 p-5 overflow-y-auto flex-shrink-0">
          <div className="space-y-6">
            {navGroups.map((group) => {
              const filteredItems = group.items.filter((item) =>
                item.title.toLowerCase().includes(searchQuery.toLowerCase())
              );

              if (filteredItems.length === 0) return null;

              return (
                <div key={group.groupTitle} className="space-y-1">
                  <h4 className="px-2.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    {group.groupTitle}
                  </h4>
                  <div className="space-y-0.5 pt-1">
                    {filteredItems.map((item) => {
                      const isActive = activeSection === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setActiveSection(item.id)}
                          className={`w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all text-left ${
                            isActive
                              ? "bg-zinc-800 text-emerald-400 shadow-sm"
                              : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                          }`}
                        >
                          <span className="truncate">{item.title}</span>
                          {item.badge && (
                            <span
                              className={`rounded px-1.5 py-0.2 text-[9px] font-semibold uppercase ${
                                item.badge === "Live"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                  : item.badge === "Important"
                                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                                  : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Zone de Contenu Principal (Articles) */}
        <main className="flex-1 overflow-y-auto bg-zinc-900/20 p-8 lg:p-12">
          <div className="max-w-3xl mx-auto space-y-10">
            {/* SECTION 1 : INTRODUCTION */}
            {activeSection === "intro" && (
              <article className="space-y-6 animate-in fade-in duration-200">
                <div className="space-y-2 border-b border-zinc-800/80 pb-6">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                    <Sparkles size={14} />
                    <span>Vue d'ensemble</span>
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
                    Présentation d'AgoraExam
                  </h1>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    AgoraExam est un navigateur d'examen sécurisé (*Lockdown Browser*) et un système
                    de télésurveillance éthique pour Moodle, exécuté **100% en local** sur la machine de l'étudiant.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                      <Lock size={15} className="text-emerald-400" />
                      <span>Mode Kiosk Absolu</span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Verrouillage plein écran forcé, neutralisation d'Alt+Tab, Alt+F4, capture d'écran
                      et masquage de la barre des tâches.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                      <Monitor size={15} className="text-blue-400" />
                      <span>Détection Anti-Multi-Écran</span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Contrôle matériel du système d'exploitation et blocage instantané dès qu'un moniteur
                      secondaire (HDMI, AirPlay) est branché.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-xs text-zinc-300 space-y-2">
                  <strong className="text-emerald-400 block font-semibold">
                    💡 Pourquoi remplacer Respondus ou Proctorio ?
                  </strong>
                  <p className="leading-relaxed text-zinc-400">
                    AgoraExam est open-source, pèse moins de 15 Mo, n'installe aucun pilote noyau invasif
                    et ne diffuse aucun flux vidéo vers le cloud, garantissant un respect absolu du RGPD.
                  </p>
                </div>
              </article>
            )}

            {/* SECTION 2 : ARCHITECTURE & ÉTHIQUE RGPD */}
            {activeSection === "edge-ai" && (
              <article className="space-y-6 animate-in fade-in duration-200">
                <div className="space-y-2 border-b border-zinc-800/80 pb-6">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                    <Cpu size={14} />
                    <span>Sécurité & Conformité</span>
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
                    Architecture & IA Éthique (RGPD)
                  </h1>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Comment AgoraExam garantit la justice académique sans compromettre la vie privée des étudiants.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-2">
                    <h3 className="text-xs font-semibold text-zinc-200">
                      1. Inférence 100% sur le processeur local (Edge AI)
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      L'analyse faciale est réalisée en WebAssembly via <strong>Google MediaPipe</strong>.
                      Les images de la caméra entrent dans la mémoire vive de l'ordinateur, sont traitées,
                      et sont immédiatement écrasées. Aucun octet de vidéo ne transite par Internet.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-2">
                    <h3 className="text-xs font-semibold text-zinc-200">
                      2. Preuves proportionnées (Principe de Minimisation des Données)
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Seules des photographies ponctuelles au moment exact d'un incident avéré (Strike)
                      sont archivées localement avec empreinte cryptographique SHA-256.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-2">
                    <h3 className="text-xs font-semibold text-zinc-200">
                      3. Effacement immédiat de la RAM (Zeroize)
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Les jetons d'accès API Moodle et clés de session sont automatiquement écrasés
                      par des zéros en mémoire vive via la crate Rust <code className="text-emerald-400">zeroize</code>.
                    </p>
                  </div>
                </div>
              </article>
            )}

            {/* SECTION 3 : TÉLÉCHARGEMENT DIRECT */}
            {activeSection === "telechargement" && (
              <article className="space-y-6 animate-in fade-in duration-200">
                <div className="space-y-2 border-b border-zinc-800/80 pb-6">
                  <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
                    Téléchargements Officiels
                  </h1>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Téléchargez la dernière version compilée pour votre système d'exploitation.
                  </p>
                </div>

                <div className="space-y-3">
                  {[
                    {
                      os: "Windows 10 / 11",
                      format: "Installateur .exe (Sans droits admin)",
                      size: "14.2 Mo",
                      badge: "Recommandé",
                      url: "https://github.com/votre-orga/AgoraExam/releases/latest/download/AgoraExam-Setup.exe",
                    },
                    {
                      os: "macOS (Apple Silicon M1/M2/M3/M4)",
                      format: "Image disque .dmg",
                      size: "12.8 Mo",
                      badge: "Apple Silicon",
                      url: "https://github.com/votre-orga/AgoraExam/releases/latest/download/AgoraExam-aarch64.dmg",
                    },
                    {
                      os: "macOS (Processeurs Intel)",
                      format: "Image disque .dmg",
                      size: "13.4 Mo",
                      badge: "Intel x64",
                      url: "https://github.com/votre-orga/AgoraExam/releases/latest/download/AgoraExam-x64.dmg",
                    },
                    {
                      os: "Linux (Ubuntu, Debian, Fedora)",
                      format: "Exécutable universel .AppImage",
                      size: "15.1 Mo",
                      badge: "Linux",
                      url: "https://github.com/votre-orga/AgoraExam/releases/latest/download/AgoraExam.AppImage",
                    },
                  ].map((item) => (
                    <div
                      key={item.os}
                      className="flex items-center justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-950/60"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-zinc-100">{item.os}</span>
                          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
                            {item.size}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-0.5">{item.format}</p>
                      </div>

                      <a
                        href={item.url}
                        className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-emerald-400 transition-colors"
                      >
                        Télécharger
                      </a>
                    </div>
                  ))}
                </div>
              </article>
            )}

            {/* SECTION 4 : RÈGLE DES 3 STRIKES */}
            {activeSection === "regle-strikes" && (
              <article className="space-y-6 animate-in fade-in duration-200">
                <div className="space-y-2 border-b border-zinc-800/80 pb-6">
                  <div className="flex items-center gap-2 text-xs font-semibold text-rose-400 uppercase tracking-wider">
                    <AlertTriangle size={14} />
                    <span>Règlement d'Examen</span>
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
                    La Règle des 3 Strikes & Tolérance 4s
                  </h1>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Comprendre le fonctionnement des avertissements pour composer sereinement.
                  </p>
                </div>

                <div className="space-y-4 text-xs text-zinc-300 leading-relaxed">
                  <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-2">
                    <strong className="text-amber-400 font-semibold block">
                      🛡️ La Tolérance de 4 secondes (Anti-Faux Positifs)
                    </strong>
                    <p className="text-zinc-300">
                      Un éternuement, un stylo qui tombe par terre ou un clignement d'yeux ne déclenche 
                      <strong> aucun avertissement</strong>. L'avertissement n'est déclenché que si le visage
                      quitte le champ de la caméra de manière ininterrompue pendant plus de 4 secondes consécutives.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-2">
                    <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 text-center space-y-2">
                      <span className="text-xs font-bold text-amber-400 font-mono">STRIKE 1</span>
                      <h4 className="text-xs font-semibold text-zinc-100">Notification</h4>
                      <p className="text-[11px] text-zinc-400">
                        Avertissement pédagogique. Vous avez juste à cliquer pour reprendre l'épreuve.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 text-center space-y-2">
                      <span className="text-xs font-bold text-orange-400 font-mono">STRIKE 2</span>
                      <h4 className="text-xs font-semibold text-zinc-100">Dernier Rappel</h4>
                      <p className="text-[11px] text-zinc-400">
                        Attention : la prochaine infraction entraînera l'expulsion immédiate.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-500/10 text-center space-y-2">
                      <span className="text-xs font-bold text-rose-400 font-mono">STRIKE 3</span>
                      <h4 className="text-xs font-semibold text-rose-300">Kill Switch</h4>
                      <p className="text-[11px] text-zinc-400">
                        Tentative soumise et clôturée automatiquement sur Moodle.
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            )}

            {/* SECTION 5 : DÉPANNAGE CAMÉRA */}
            {activeSection === "depannage-camera" && (
              <article className="space-y-6 animate-in fade-in duration-200">
                <div className="space-y-2 border-b border-zinc-800/80 pb-6">
                  <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
                    Guide de Dépannage Caméra & Micro
                  </h1>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Résoudre en 30 secondes les 3 causes fréquentes de blocage de webcam.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-2">
                    <h3 className="text-xs font-semibold text-zinc-200">
                      1. "Caméra occupée par une autre application"
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Sous Windows, une seule application à la fois peut utiliser la caméra.
                      Fermez complètement <strong>Discord, Zoom, Microsoft Teams, WhatsApp</strong> ou <strong>Skype</strong> (vérifiez également la barre des tâches près de l'horloge).
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-2">
                    <h3 className="text-xs font-semibold text-zinc-200">
                      2. Autoriser la Caméra sur macOS (Gatekeeper)
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Ouvrez <em>Réglages Système &gt; Confidentialité et sécurité &gt; Appareil photo</em>, puis cochez <strong>AgoraExam</strong> dans la liste des applications autorisées.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-2">
                    <h3 className="text-xs font-semibold text-zinc-200">
                      3. Plusieurs écrans détectés par erreur
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Si vous utilisez un PC portable avec écran externe branché, débranchez le câble HDMI ou DisplayPort. Sur macOS, assurez-vous de désactiver la duplication d'écran via AirPlay ou Sidecar (iPad).
                    </p>
                  </div>
                </div>
              </article>
            )}

            {/* SECTION 6 : GUIDE ENSEIGNANT */}
            {activeSection === "enseignant-guide" && (
              <article className="space-y-6 animate-in fade-in duration-200">
                <div className="space-y-2 border-b border-zinc-800/80 pb-6">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                    <GraduationCap size={14} />
                    <span>Enseignants & Pédagogie</span>
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
                    Verrouiller son Test Moodle en 2 Minutes
                  </h1>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Aucun plugin ni compétence informatique nécessaire. Tout repose sur le mot de passe masqué de Moodle.
                  </p>
                </div>

                <div className="space-y-4 text-xs text-zinc-300 leading-relaxed">
                  <div className="flex gap-4 items-start p-4 rounded-xl border border-zinc-800 bg-zinc-950/60">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 font-mono font-bold flex-shrink-0">
                      1
                    </span>
                    <div>
                      <strong className="text-zinc-100 block mb-1">
                        Définir un mot de passe complexe sur le test Moodle
                      </strong>
                      Dans les paramètres du Quiz Moodle, dépliez l'onglet <em>Restrictions supplémentaires sur les tentatives</em> et entrez une clé aléatoire (ex: <code className="text-emerald-400">Ex@m_Maths_2026!</code>). <strong>Ne donnez jamais cette clé aux étudiants.</strong>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start p-4 rounded-xl border border-zinc-800 bg-zinc-950/60">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 font-mono font-bold flex-shrink-0">
                      2
                    </span>
                    <div>
                      <strong className="text-zinc-100 block mb-1">
                        Insérer le lien AgoraExam dans la description
                      </strong>
                      Utilisez notre générateur ci-après pour copier/coller le bouton de démarrage officiel dans la description de votre cours.
                    </div>
                  </div>

                  <div className="flex gap-4 items-start p-4 rounded-xl border border-zinc-800 bg-zinc-950/60">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 font-mono font-bold flex-shrink-0">
                      3
                    </span>
                    <div>
                      <strong className="text-zinc-100 block mb-1">
                        Résultat sécurisé instantané
                      </strong>
                      L'étudiant qui essaie d'ouvrir le test dans Google Chrome ou Safari ne connaît pas le mot de passe et ne peut pas composer. Seul AgoraExam injecte le mot de passe après avoir verrouillé l'ordinateur en mode Kiosk !
                    </div>
                  </div>
                </div>
              </article>
            )}

            {/* SECTION 7 : GÉNÉRATEUR INTERACTIF MOODLE */}
            {activeSection === "generateur-moodle" && (
              <article className="space-y-6 animate-in fade-in duration-200">
                <div className="space-y-2 border-b border-zinc-800/80 pb-6">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                    <Code2 size={14} />
                    <span>Outil Interactif Enseignant</span>
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
                    Générateur de Bouton Moodle
                  </h1>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Renseignez les détails de votre épreuve pour générer le bloc HTML officiel prêt à coller dans Moodle.
                  </p>
                </div>

                <div className="space-y-5">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-300 block mb-1.5">
                        ID du Quiz Moodle
                      </label>
                      <input
                        type="text"
                        value={moodleQuizId}
                        onChange={(e) => setMoodleQuizId(e.target.value)}
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-xs font-mono text-zinc-200 focus:border-emerald-500/50 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-zinc-300 block mb-1.5">
                        URL de votre Moodle
                      </label>
                      <input
                        type="text"
                        value={moodleUrl}
                        onChange={(e) => setMoodleUrl(e.target.value)}
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-xs text-zinc-200 focus:border-emerald-500/50 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-zinc-300 block mb-1.5">
                        Nom de l'Épreuve
                      </label>
                      <input
                        type="text"
                        value={examName}
                        onChange={(e) => setExamName(e.target.value)}
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-xs text-zinc-200 focus:border-emerald-500/50 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                      />
                    </div>
                  </div>

                  {/* Prévisualisation en direct */}
                  <div>
                    <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
                      Prévisualisation telle que vue par l'étudiant sur Moodle :
                    </span>
                    <div
                      className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/70"
                      dangerouslySetInnerHTML={{ __html: generatedMoodleHtml }}
                    />
                  </div>

                  {/* Code HTML à copier */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                        Code HTML à coller dans Moodle :
                      </span>
                      <button
                        onClick={() => copyToClipboard(generatedMoodleHtml, "moodle-html")}
                        className="flex items-center gap-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                      >
                        {copiedSnippet === "moodle-html" ? (
                          <>
                            <Check size={13} />
                            <span>Copié dans le presse-papier !</span>
                          </>
                        ) : (
                          <>
                            <Copy size={13} />
                            <span>Copier le Code HTML</span>
                          </>
                        )}
                      </button>
                    </div>

                    <pre className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-[11px] font-mono text-zinc-300 overflow-x-auto">
                      {generatedMoodleHtml}
                    </pre>
                  </div>
                </div>
              </article>
            )}

            {/* SECTION 8 : DSI & DÉPLOIEMENT */}
            {activeSection === "dsi-deploiement" && (
              <article className="space-y-6 animate-in fade-in duration-200">
                <div className="space-y-2 border-b border-zinc-800/80 pb-6">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                    <Server size={14} />
                    <span>DSI & Administrateurs</span>
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
                    Déploiement en Masse (Intune, GPO, Jamf)
                  </h1>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Comment équiper les salles d'examen et les parcs machines universitaires en mode silencieux.
                  </p>
                </div>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-200">
                        Commande d'installation silencieuse Windows (MSI / Intune)
                      </span>
                      <button
                        onClick={() =>
                          copyToClipboard(
                            'msiexec.exe /i "AgoraExam.msi" /qn /norestart ALLUSERS=1',
                            "msi-cmd"
                          )
                        }
                        className="text-xs text-zinc-400 hover:text-white flex items-center gap-1"
                      >
                        {copiedSnippet === "msi-cmd" ? <Check size={12} /> : <Copy size={12} />}
                        <span>Copier</span>
                      </button>
                    </div>
                    <pre className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950 text-xs font-mono text-emerald-400">
                      msiexec.exe /i "AgoraExam.msi" /qn /norestart ALLUSERS=1
                    </pre>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-200">
                        Commande de déploiement macOS via Jamf / MDM (PKG)
                      </span>
                      <button
                        onClick={() =>
                          copyToClipboard(
                            "sudo installer -pkg AgoraExam.pkg -target /",
                            "pkg-cmd"
                          )
                        }
                        className="text-xs text-zinc-400 hover:text-white flex items-center gap-1"
                      >
                        {copiedSnippet === "pkg-cmd" ? <Check size={12} /> : <Copy size={12} />}
                        <span>Copier</span>
                      </button>
                    </div>
                    <pre className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950 text-xs font-mono text-emerald-400">
                      sudo installer -pkg AgoraExam.pkg -target /
                    </pre>
                  </div>
                </div>
              </article>
            )}

            {/* SECTION 9 : DSI SÉCURITÉ & PORTS */}
            {activeSection === "dsi-securite" && (
              <article className="space-y-6 animate-in fade-in duration-200">
                <div className="space-y-2 border-b border-zinc-800/80 pb-6">
                  <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
                    Règles Pare-feu & Signature de Code
                  </h1>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Spécifications techniques réseau pour les pare-feux de campus.
                  </p>
                </div>

                <div className="space-y-4 text-xs text-zinc-300 leading-relaxed">
                  <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-2">
                    <h3 className="font-semibold text-zinc-200">Ports réseau sortants :</h3>
                    <p className="text-zinc-400">
                      AgoraExam n'utilise que le protocole <strong>HTTPS standard (Port 443 TCP)</strong> vers le nom de domaine de votre université. Aucun port exotique, socket UDP ou tunnel VPN n'est requis.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-2">
                    <h3 className="font-semibold text-zinc-200">Certificat de Signature de Code (EV) :</h3>
                    <p className="text-zinc-400">
                      Pour éviter tout pop-up SmartScreen sur les ordinateurs des étudiants, configurez la clé de signature dans votre pipeline CI/CD via les variables d'environnement Tauri :
                    </p>
                    <pre className="p-2.5 rounded-lg bg-zinc-900 font-mono text-[11px] text-emerald-400">
                      TAURI_SIGNING_PRIVATE_KEY="chemin/vers/cle.key"
                    </pre>
                  </div>
                </div>
              </article>
            )}

            {/* SECTION 10 : BAC À SABLE DIAGNOSTIC WEB EN DIRECT */}
            {activeSection === "bac-a-sable" && (
              <article className="space-y-6 animate-in fade-in duration-200">
                <div className="space-y-2 border-b border-zinc-800/80 pb-6">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                    <Sparkles size={14} />
                    <span>Test Matériel En Direct</span>
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
                    Bac à Sable de Diagnostic Caméra
                  </h1>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Testez votre caméra directement dans cette page de documentation sans démarrer d'examen.
                  </p>
                </div>

                <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-950/80 space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-semibold text-zinc-100">
                        Vérificateur Vidéo Live
                      </h3>
                      <p className="text-[11px] text-zinc-400">
                        Permet aux étudiants de vérifier leur éclairage et posture avant l'examen.
                      </p>
                    </div>

                    <button
                      onClick={toggleSandboxCamera}
                      className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all shadow-sm ${
                        sandboxActive
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30"
                          : "bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
                      }`}
                    >
                      {sandboxActive ? (
                        <>
                          <VideoOff size={14} />
                          <span>Arrêter le Test</span>
                        </>
                      ) : (
                        <>
                          <Play size={14} />
                          <span>Démarrer le Test Caméra</span>
                        </>
                      )}
                    </button>
                  </div>

                  {sandboxError && (
                    <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs">
                      {sandboxError}
                    </div>
                  )}

                  <div className="relative aspect-video w-full max-w-md mx-auto rounded-xl overflow-hidden bg-black border border-zinc-800 flex items-center justify-center">
                    {sandboxActive ? (
                      <>
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
                        <div className="absolute top-2.5 left-2.5 rounded-full bg-emerald-500/80 px-2 py-0.5 text-[10px] font-mono text-zinc-950 font-semibold backdrop-blur">
                          LIVE 30 FPS
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-zinc-600 gap-2 p-6 text-center">
                        <Camera size={32} />
                        <span className="text-xs">Cliquez sur « Démarrer le Test » pour tester votre flux</span>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
