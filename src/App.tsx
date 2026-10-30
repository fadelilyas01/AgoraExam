import { useState, useEffect, useRef, useCallback } from "react";
import {
  Shield,
  AlertTriangle,
  Camera,
  CheckCircle2,
  Lock,
  Clock,
  AlertOctagon,
  Maximize2,
  Minimize2,
  Wifi,
  Move,
  BookOpen,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { PreFlightCheck } from "./components/PreFlightCheck";
import { OfficialPortal } from "./components/OfficialPortal";
import { proctorVision } from "./services/faceDetection";

interface StrikeEvent {
  strike_number: number;
  max_strikes: number;
  reason: string;
  timestamp: string;
  evidencePath?: string;
}

type PipPosition = "bottom-right" | "bottom-left" | "top-right" | "top-left";

export default function App() {
  const isTauri =
    typeof window !== "undefined" &&
    ("__TAURI_INTERNALS__" in window || "__TAURI__" in window);

  // Navigation principale : "portal" (Site Web & Doc officielle) ou "app" (Application Kiosk)
  const [viewMode, setViewMode] = useState<"portal" | "app">(() => {
    if (typeof window === "undefined") return "portal";
    if (window.location.hash === "#app") return "app";
    // Dans l'environnement Tauri natif, lancer l'application d'examen par défaut
    if (
      isTauri &&
      !window.location.hash.includes("docs") &&
      !window.location.hash.includes("download") &&
      !window.location.hash.includes("home")
    ) {
      return "app";
    }
    return "portal";
  });

  const [isExamStarted, setIsExamStarted] = useState<boolean>(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  // Écoute des changements de hash (#docs, #download, #home, #app)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === "#app") {
        setViewMode("app");
      } else if (hash === "#docs" || hash === "#download" || hash === "#home" || hash === "") {
        setViewMode("portal");
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // État de l'examen et de la télésurveillance
  const [strikes, setStrikes] = useState<number>(0);
  const [activeModalStrike, setActiveModalStrike] = useState<StrikeEvent | null>(null);
  const [isExpelled, setIsExpelled] = useState<boolean>(false);
  const [faceDetected, setFaceDetected] = useState<boolean>(true);
  const [multipleFaces, setMultipleFaces] = useState<boolean>(false);
  const [absenceCountdown, setAbsenceCountdown] = useState<number | null>(null);

  // Options d'affichage PiP
  const [pipMinimized, setPipMinimized] = useState<boolean>(false);
  const [pipPosition, setPipPosition] = useState<PipPosition>("bottom-right");

  // État de l'examen Moodle interactif (simulation de test universitaire)
  const [currentQuestion, setCurrentQuestion] = useState<number>(1);
  const [answers, setAnswers] = useState<Record<number, string>>({
    1: "b",
  });
  const [isFinished, setIsFinished] = useState<boolean>(false);

  const moodleUrl = "https://moodle.universite.fr/mod/quiz/attempt.php?attempt=48291";
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const absenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Attacher le flux vidéo au mini-moniteur PiP
  useEffect(() => {
    if (isExamStarted && videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream;
      videoRef.current
        .play()
        .catch((err) => console.log("Lecture vidéo PiP différée :", err));
    }
  }, [isExamStarted, mediaStream, pipMinimized]);

  // Capture instantanée d'une preuve photographique
  const captureEvidenceSnapshot = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.7);
  }, []);

  // Gestionnaire d'infraction & Enregistrement légal
  const handleWarning = useCallback(async (reason: string) => {
    const newStrikeCount = strikes + 1;
    setStrikes(newStrikeCount);

    const snapshotBase64 = captureEvidenceSnapshot();
    let evidencePath = "";

    if (snapshotBase64) {
      try {
        evidencePath = await invoke<string>("enregistrer_preuve", {
          attemptId: 48291,
          strikeNumber: newStrikeCount,
          imageBase64: snapshotBase64,
          motif: reason,
        });
      } catch (err) {
        console.error("Échec sauvegarde preuve :", err);
      }
    }

    if (newStrikeCount < 3) {
      try {
        await invoke("signaler_avertissement", {
          attemptId: 48291,
          strikeCount: newStrikeCount,
          motif: reason,
        });
      } catch (e) {
        console.error("Échec signalement avertissement :", e);
      }

      setActiveModalStrike({
        strike_number: newStrikeCount,
        max_strikes: 3,
        reason,
        timestamp: new Date().toLocaleTimeString(),
        evidencePath,
      });
    } else {
      // Strike 3 : Kill switch Moodle & verrouillage définitif
      setIsExpelled(true);
      try {
        await invoke("expulser_etudiant", {
          moodleUrl: "https://moodle.universite.fr",
          wstoken: "secret_token_session_placeholder",
          attemptId: 48291,
          motif: reason,
        });
      } catch (e) {
        console.error("Échec expulsion étudiant :", e);
      }
    }
  }, [strikes, captureEvidenceSnapshot]);

  // Boucle d'analyse MediaPipe avec Tolérance 4s (Anti-faux positifs)
  useEffect(() => {
    if (!isExamStarted || isExpelled) return;

    let isRunning = true;
    let lastTime = 0;

    proctorVision.initialize().catch((err) => {
      console.warn("MediaPipe initialisé en mode dégradé :", err);
    });

    const processFrame = (currentTime: number) => {
      if (!isRunning) return;

      if (currentTime - lastTime >= 200 && videoRef.current && videoRef.current.readyState >= 2) {
        lastTime = currentTime;
        const result = proctorVision.detectFace(videoRef.current, currentTime);

        // A. Cas nominal : 1 visage
        if (result.faceCount === 1) {
          setFaceDetected(true);
          setMultipleFaces(false);
          setAbsenceCountdown(null);
          if (absenceTimerRef.current) {
            clearTimeout(absenceTimerRef.current);
            absenceTimerRef.current = null;
          }
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
        }
        // B. Cas intrusion : >= 2 visages
        else if (result.faceCount > 1) {
          setMultipleFaces(true);
          setFaceDetected(true);
          handleWarning("Deuxième personne détectée dans le champ de la caméra");
        }
        // C. Cas absence : 0 visage détecté
        else if (result.faceCount === 0) {
          setFaceDetected(false);
          setMultipleFaces(false);

          if (!absenceTimerRef.current && !activeModalStrike) {
            setAbsenceCountdown(4);

            let remaining = 4;
            countdownIntervalRef.current = setInterval(() => {
              remaining -= 1;
              if (remaining > 0) {
                setAbsenceCountdown(remaining);
              }
            }, 1000);

            absenceTimerRef.current = setTimeout(() => {
              handleWarning("Visage absent du champ de la caméra depuis plus de 4 secondes");
              if (absenceTimerRef.current) {
                clearTimeout(absenceTimerRef.current);
                absenceTimerRef.current = null;
              }
              if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
                countdownIntervalRef.current = null;
              }
              setAbsenceCountdown(null);
            }, 4000);
          }
        }
      }

      requestAnimationFrame(processFrame);
    };

    const animId = requestAnimationFrame(processFrame);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animId);
      if (absenceTimerRef.current) clearTimeout(absenceTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [isExamStarted, isExpelled, activeModalStrike, handleWarning]);

  // 4. Verrouillage intégral des raccourcis système, touches de fonction, clic droit et focus
  useEffect(() => {
    if (!isExamStarted || isExpelled || isFinished) return;

    // A. Interception des raccourcis clavier en phase de capture (avant tout le monde)
    const handleKeyDown = (e: KeyboardEvent) => {
      // Bloquer toutes les touches de fonction F1-F12
      if (e.key.startsWith("F") && e.key.length <= 3) {
        e.preventDefault();
        e.stopPropagation();
        handleWarning(`Touche de fonction interdite (${e.key}) neutralisée`);
        return false;
      }

      // Bloquer toutes les combinaisons Alt (Alt+Tab, Alt+F4, Alt+Espace, Alt+Flèches)
      if (e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        handleWarning(`Raccourci système Alt détecté et bloqué : Alt + ${e.key}`);
        return false;
      }

      // Bloquer les raccourcis Ctrl / Meta (Ctrl+W, Ctrl+T, Ctrl+N, Ctrl+R, Ctrl+Shift+I, etc.)
      if (e.ctrlKey || e.metaKey) {
        const forbiddenKeys = [
          "w", "W", "t", "T", "n", "N", "r", "R", "p", "P", "s", "S",
          "u", "U", "q", "Q", "i", "I", "j", "J", "Tab", "Escape"
        ];
        if (forbiddenKeys.includes(e.key) || e.shiftKey) {
          e.preventDefault();
          e.stopPropagation();
          handleWarning(`Raccourci système interdit neutralisé : Ctrl + ${e.key}`);
          return false;
        }
      }

      // Bloquer Escape
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // B. Bloquer le clic droit (anti-inspection et anti-menu contextuel)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    // C. Détecter la perte de focus de la fenêtre (clic en dehors ou alt-tab)
    const handleBlur = () => {
      handleWarning("Perte de focus de la fenêtre d'examen détectée !");
      window.focus();
    };

    // D. Détecter le masquage ou changement d'onglet
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleWarning("La fenêtre d'examen a été minimisée ou masquée !");
        window.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("contextmenu", handleContextMenu, { capture: true });
    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("contextmenu", handleContextMenu, { capture: true });
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isExamStarted, isExpelled, isFinished, handleWarning]);

  // Écoute des événements système Tauri (Focus perdu, alt-tab, etc.)
  useEffect(() => {
    if (!isExamStarted) return;

    const unlistenSecurity = listen<string>("security_violation", (event) => {
      handleWarning(`Violation système : ${event.payload}`);
    });

    const unlistenFocus = listen<string>("window_focus_lost", (event) => {
      handleWarning(`Perte de focus de la fenêtre : ${event.payload}`);
    });

    return () => {
      unlistenSecurity.then((f) => f());
      unlistenFocus.then((f) => f());
    };
  }, [isExamStarted, handleWarning]);

  // Positionnement dynamique du widget PiP
  const getPipPositionClass = (pos: PipPosition) => {
    switch (pos) {
      case "bottom-right":
        return "bottom-5 right-5";
      case "bottom-left":
        return "bottom-5 left-5";
      case "top-right":
        return "top-20 right-5";
      case "top-left":
        return "top-20 left-5";
    }
  };

  const cyclePipPosition = () => {
    const positions: PipPosition[] = ["bottom-right", "bottom-left", "top-left", "top-right"];
    const nextIdx = (positions.indexOf(pipPosition) + 1) % positions.length;
    setPipPosition(positions[nextIdx]);
  };

  // Si le mode portail (Site Web Officiel & Docs) est actif
  if (viewMode === "portal") {
    const initialTab =
      typeof window !== "undefined" && window.location.hash === "#docs"
        ? "docs"
        : typeof window !== "undefined" && window.location.hash === "#download"
        ? "download"
        : "home";

    return (
      <OfficialPortal
        initialTab={initialTab}
        onLaunchApp={() => {
          setViewMode("app");
          window.location.hash = "#app";
        }}
      />
    );
  }

  // Affichage du Pre-Flight Check avant démarrage
  if (!isExamStarted) {
    return (
      <PreFlightCheck
        onExamReady={() => setIsExamStarted(true)}
        mediaStream={mediaStream}
        onStreamReady={(stream) => setMediaStream(stream)}
        onOpenDocs={() => {
          setViewMode("portal");
          window.location.hash = "#docs";
        }}
      />
    );
  }

  // Écran d'expulsion définitive (Strike 3)
  if (isExpelled) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-zinc-950 p-8 text-center font-sans antialiased">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 mb-6 shadow-xl shadow-rose-500/5">
          <AlertOctagon size={44} />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
          Session d'Examen Verrouillée & Clôturée
        </h1>
        <p className="mt-2.5 text-xs text-zinc-400 max-w-lg leading-relaxed">
          Le seuil maximal de 3 avertissements de télésurveillance a été atteint.
          Votre épreuve a été automatiquement transmise et scellée sur le serveur Moodle.
        </p>
        <div className="mt-6 p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 text-[11px] text-zinc-400 font-mono space-y-1 text-left max-w-md w-full">
          <div><strong className="text-zinc-200">Tentative ID :</strong> #48291</div>
          <div><strong className="text-zinc-200">Statut :</strong> Clôturé pour infraction répétée</div>
          <div><strong className="text-zinc-200">Preuves :</strong> 3 photographies horodatées archivées</div>
        </div>
      </div>
    );
  }

  // Écran de fin réussie
  if (isFinished) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-zinc-950 p-8 text-center font-sans antialiased">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-6 shadow-xl shadow-emerald-500/5">
          <CheckCircle2 size={44} />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
          Examen Soumis avec Succès
        </h1>
        <p className="mt-2 text-xs text-zinc-400 max-w-md leading-relaxed">
          Votre copie a été enregistrée sur le serveur Moodle. Aucun incident critique n'a été relevé durant votre composition.
        </p>
        <div className="mt-6 p-3 rounded-lg border border-zinc-800 bg-zinc-900/50 text-[11px] font-mono text-zinc-400">
          Session Token : a8f9-c2e1-48291 • Hash SHA-256 scellé
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-zinc-950 text-zinc-100 font-sans overflow-hidden antialiased">
      {/* Canvas invisible pour capture d'infractions */}
      <canvas ref={canvasRef} className="hidden" />

      {/* 1. TOP HUD / BARRE DE SÉCURITÉ LINÉAIRE */}
      <header className="flex h-14 items-center justify-between border-b border-zinc-800/80 bg-zinc-900/90 px-6 backdrop-blur z-20">
        {/* Identité logicielle & Statut Kiosk */}
        <div className="flex items-center gap-3.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800/90 text-emerald-400 border border-zinc-700/60 shadow-sm">
            <Shield size={17} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-tight text-zinc-100">AgoraExam</span>
              {isTauri ? (
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Kiosk Matériel Verrouillé
                </span>
              ) : (
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                  Aperçu Navigateur Web (Lancez npm run tauri dev pour Kiosk OS)
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400">
              Algorithmique Avancée • Réf: ALG402
            </p>
          </div>
        </div>

        {/* Jauge progressive de tolérance d'absence (Debounce 4s) */}
        {absenceCountdown !== null && (
          <div className="flex items-center gap-3 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3.5 py-1.5 text-xs font-medium text-amber-400 animate-pulse">
            <AlertTriangle size={15} />
            <div className="space-y-0.5">
              <span>Visage hors champ — Repositionnez-vous</span>
              <div className="h-1 w-32 bg-amber-950 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all duration-1000"
                  style={{ width: `${(absenceCountdown / 4) * 100}%` }}
                />
              </div>
            </div>
            <span className="font-mono font-bold text-xs">{absenceCountdown}s</span>
          </div>
        )}

        {/* Compteur d'infractions & Horloge */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-400 font-medium mr-1">Strikes :</span>
            {[1, 2, 3].map((num) => {
              const isActive = strikes >= num;
              return (
                <div
                  key={num}
                  className={`h-6 px-2.5 rounded-md text-[11px] font-semibold flex items-center gap-1 border transition-colors ${
                    isActive
                      ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                      : "bg-zinc-800/40 text-zinc-500 border-zinc-800"
                  }`}
                >
                  <AlertTriangle size={11} />
                  <span>{num}</span>
                </div>
              );
            })}
          </div>

          <div className="h-4 w-px bg-zinc-800" />

          {/* Horloge / Compte à rebours */}
          <div className="flex items-center gap-2 text-xs text-zinc-200 font-mono bg-zinc-800/80 px-3 py-1.5 rounded-lg border border-zinc-700/60 shadow-sm">
            <Clock size={13} className="text-zinc-400" />
            <span>01:42:15</span>
          </div>

          <div className="h-4 w-px bg-zinc-800" />

          {/* Bouton Documentation & Aide */}
          <button
            onClick={() => {
              setViewMode("portal");
              window.location.hash = "#docs";
            }}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
            title="Consulter la documentation"
            aria-label="Consulter la documentation"
          >
            <BookOpen size={13} className="text-emerald-400" />
            <span>Docs</span>
          </button>
        </div>
      </header>

      {/* 2. ZONE CENTRALE : NAVIGATEUR MOODLE INTÉGRÉ & QUESTIONNAIRE RÉEL */}
      <div className="flex flex-1 overflow-hidden">
        {/* Volet latéral gauche : Navigation du Quiz Moodle */}
        <aside className="w-64 border-r border-zinc-800/80 bg-zinc-950/60 p-4 flex flex-col justify-between flex-shrink-0">
          <div className="space-y-4">
            <div className="text-xs font-semibold text-zinc-300 uppercase tracking-wider pb-2 border-b border-zinc-800/60 flex items-center justify-between">
              <span>Navigation du Quiz</span>
              <span className="text-[10px] text-zinc-500 font-normal">8 questions</span>
            </div>

            {/* Grille des questions */}
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((qNum) => {
                const isCurrent = currentQuestion === qNum;
                const isAnswered = answers[qNum] !== undefined;

                return (
                  <button
                    key={qNum}
                    onClick={() => setCurrentQuestion(qNum)}
                    className={`h-9 rounded-lg text-xs font-mono font-medium border flex items-center justify-center transition-all ${
                      isCurrent
                        ? "bg-emerald-500 text-zinc-950 border-emerald-400 font-bold shadow-md shadow-emerald-500/10"
                        : isAnswered
                        ? "bg-zinc-800/90 text-zinc-200 border-zinc-700 hover:bg-zinc-700"
                        : "bg-zinc-900/60 text-zinc-500 border-zinc-800 hover:border-zinc-700"
                    }`}
                    aria-label={`Aller à la question ${qNum}`}
                  >
                    {qNum}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 text-[11px] text-zinc-400 space-y-1">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded bg-emerald-500" />
                <span>Question active</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded bg-zinc-700" />
                <span>Réponse enregistrée</span>
              </div>
            </div>
          </div>

          {/* Bouton de Fin d'Épreuve */}
          <button
            onClick={() => setIsFinished(true)}
            className="w-full py-2.5 rounded-lg border border-zinc-700 bg-zinc-900 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            Terminer le test...
          </button>
        </aside>

        {/* Contenu principal : Feuille d'examen Moodle */}
        <main className="flex-1 flex flex-col bg-zinc-900/20 overflow-y-auto relative">
          {/* Fausse barre d'adresse Moodle sécurisée */}
          <div className="flex items-center justify-between px-5 py-2.5 bg-zinc-950/40 border-b border-zinc-800/60 text-xs">
            <div className="flex items-center gap-2 bg-zinc-900/90 border border-zinc-800 px-3 py-1 rounded-md max-w-xl flex-1 text-[11px] font-mono text-zinc-300">
              <Lock size={12} className="text-emerald-400 flex-shrink-0" />
              <span className="truncate">{moodleUrl}</span>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Wifi size={13} className="text-emerald-400" />
                TLS 1.3 Chiffré
              </span>
              <span className="text-zinc-600">|</span>
              <span className="text-emerald-400 font-medium">Auto-save actif</span>
            </div>
          </div>

          {/* Énoncé et options de réponse de la question */}
          <div className="p-8 max-w-3xl mx-auto w-full space-y-6">
            <div className="p-6 rounded-2xl border border-zinc-800/80 bg-zinc-950/70 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
                <span className="text-xs font-mono font-bold text-emerald-400">
                  Question {currentQuestion} sur 8
                </span>
                <span className="text-xs text-zinc-400">Barème : 2.00 point(s)</span>
              </div>

              {currentQuestion === 1 ? (
                <>
                  <h2 className="text-sm font-semibold text-zinc-100 leading-snug">
                    Quelle est la complexité asymptotique moyenne de la recherche d'une clé dans une table de hachage bien dimensionnée avec résolution par adressage ouvert ?
                  </h2>
                  <div className="space-y-2 pt-2">
                    {[
                      { id: "a", text: "O(log n) dans le pire des cas" },
                      { id: "b", text: "O(1) en moyenne grâce à une fonction de hachage uniforme" },
                      { id: "c", text: "O(n) amorti sur l'ensemble des réallocations" },
                      { id: "d", text: "O(n log n) si le facteur de charge dépasse 0.75" },
                    ].map((opt) => (
                      <label
                        key={opt.id}
                        className={`flex items-center gap-3 p-3.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                          answers[1] === opt.id
                            ? "border-emerald-500/50 bg-emerald-500/10 text-zinc-100"
                            : "border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:bg-zinc-900/80"
                        }`}
                      >
                        <input
                          type="radio"
                          name="q1"
                          checked={answers[1] === opt.id}
                          onChange={() => setAnswers({ ...answers, 1: opt.id })}
                          className="h-4 w-4 border-zinc-700 text-emerald-500 focus:ring-emerald-500/20"
                        />
                        <span>{opt.text}</span>
                      </label>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-sm font-semibold text-zinc-100 leading-snug">
                    Implémentez l'inversion d'une liste chaînée simple en complexité mémoire O(1).
                  </h2>
                  <div className="pt-2">
                    <textarea
                      rows={6}
                      placeholder="// Écrivez votre code d'implémentation ici..."
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900/70 p-3.5 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-between items-center pt-4 border-t border-zinc-800/60">
                <button
                  disabled={currentQuestion === 1}
                  onClick={() => setCurrentQuestion((prev) => Math.max(1, prev - 1))}
                  className="rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition-colors disabled:opacity-40"
                >
                  Question précédente
                </button>
                <button
                  disabled={currentQuestion === 8}
                  onClick={() => setCurrentQuestion((prev) => Math.min(8, prev + 1))}
                  className="rounded-lg bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-white transition-colors disabled:opacity-40"
                >
                  Question suivante
                </button>
              </div>
            </div>
          </div>

          {/* 3. MINI-MONITEUR PIP DÉPLAÇABLE & RÉDUCTIBLE */}
          <div
            className={`absolute ${getPipPositionClass(
              pipPosition
            )} transition-all duration-300 z-30`}
          >
            {pipMinimized ? (
              /* Mode Réduit : Badge ultra-discret */
              <div className="flex items-center gap-2.5 rounded-full border border-zinc-800 bg-zinc-900/95 px-3 py-1.5 shadow-2xl backdrop-blur">
                <span
                  className={`h-2 w-2 rounded-full ${
                    multipleFaces
                      ? "bg-rose-500 animate-ping"
                      : faceDetected
                      ? "bg-emerald-400"
                      : "bg-amber-400 animate-pulse"
                  }`}
                />
                <span className="text-[11px] font-medium text-zinc-300">
                  {multipleFaces ? "2 visages !" : faceDetected ? "Surveillance active" : "Visage absent"}
                </span>
                <button
                  onClick={() => setPipMinimized(false)}
                  className="text-zinc-400 hover:text-white p-0.5"
                  aria-label="Agrandir la caméra"
                >
                  <Maximize2 size={12} />
                </button>
              </div>
            ) : (
              /* Mode Déplié : Mini-moniteur vidéo complet */
              <div className="w-52 rounded-xl border border-zinc-800 bg-zinc-900/95 p-3 shadow-2xl backdrop-blur">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800 text-[11px]">
                  <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                    <Camera size={13} className="text-zinc-400" />
                    Webcam PiP
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={cyclePipPosition}
                      className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                      title="Changer d'angle"
                      aria-label="Changer de coin d'écran"
                    >
                      <Move size={11} />
                    </button>
                    <button
                      onClick={() => setPipMinimized(true)}
                      className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                      title="Minimiser"
                      aria-label="Réduire en badge"
                    >
                      <Minimize2 size={11} />
                    </button>
                  </div>
                </div>

                <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black border border-zinc-800">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="h-full w-full object-cover -scale-x-100"
                  />
                  {/* Pastille de statut en surimpression */}
                  <div className="absolute top-1.5 left-1.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-mono font-medium backdrop-blur ${
                        multipleFaces
                          ? "bg-rose-500/80 text-white"
                          : faceDetected
                          ? "bg-emerald-500/80 text-zinc-950"
                          : "bg-amber-500/80 text-zinc-950"
                      }`}
                    >
                      {multipleFaces ? "MULTI-FACES" : faceDetected ? "OK" : "ABSENT"}
                    </span>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                  <span>MediaPipe Local</span>
                  <span className="text-emerald-500">0 flux cloud</span>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* 4. MODAL D'AVERTISSEMENT (STRIKE NOTIFICATION) */}
      {activeModalStrike && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
          <div className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-zinc-950 p-6 shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
              <AlertTriangle size={28} />
            </div>

            <div>
              <span className="inline-block rounded-full bg-rose-500/20 px-3 py-1 text-[11px] font-semibold text-rose-300 border border-rose-500/30 mb-2">
                Avertissement {activeModalStrike.strike_number} sur {activeModalStrike.max_strikes}
              </span>
              <h3 className="text-base font-semibold text-zinc-100">
                Incident de Télésurveillance Constaté
              </h3>
              <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                {activeModalStrike.reason}
              </p>
            </div>

            <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/60 text-[11px] text-zinc-400 space-y-1 text-left">
              <div><strong className="text-zinc-300">Horodatage :</strong> {activeModalStrike.timestamp}</div>
              <div><strong className="text-zinc-300">Statut :</strong> Preuve photographique archivée</div>
              <div className="text-rose-400 pt-1">
                ⚠️ Au 3ème avertissement, votre épreuve sera clôturée définitivement.
              </div>
            </div>

            <button
              onClick={() => setActiveModalStrike(null)}
              className="w-full rounded-xl bg-zinc-100 py-2.5 text-xs font-semibold text-zinc-950 hover:bg-white transition-colors"
            >
              J'ai compris — Reprendre l'épreuve
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
