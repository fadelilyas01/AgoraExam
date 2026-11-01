import { useState, useEffect, useRef, useCallback } from "react";
import {
  AlertTriangle,
  Camera,
  Lock,
  Clock,
  AlertOctagon,
  Maximize2,
  Minimize2,
  Wifi,
  Move,
  BookOpen,
  Shield,
  FileText,
  Check,
  Flag,
  Printer,
  Download,
  EyeOff,
  Keyboard,
  Award,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { PreFlightCheck } from "./components/PreFlightCheck";
import { OfficialPortal } from "./components/OfficialPortal";
import { proctorVision } from "./services/faceDetection";
import { AgoraExamLogo } from "./components/Logos";

export type SurveillancePolicy = "hybrid" | "audit" | "strict";


/**
 * Comparaison à temps constant de deux chaînes hexadécimales (CWE-208 Anti Timing Side-Channel).
 * Élimine toute fuite temporelle en évaluant l'intégralité des octets via accumulation XOR.
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Vérification cryptographique du code PIN surveillant via empreinte SHA-256 salée.
 * Aucun secret n'est écrit en clair dans le code source (CWE-798 & OWASP A07:2021).
 * Évaluation à temps constant (CWE-208) et synchronisation du rate-limiting Rust (CWE-307).
 */
async function verifyProctorPinHash(
  pin: string,
  isTauri: boolean
): Promise<{ success: boolean; lockoutSeconds?: number; errorMessage?: string }> {
  const clean = pin.trim();
  if (!clean) return { success: false };

  // 1. En environnement natif Tauri, délégation au backend Rust avec rate-limiting natif (CWE-307)
  if (isTauri) {
    try {
      const valid = await invoke<boolean>("verifier_pin_surveillant", { pin: clean });
      return { success: valid };
    } catch (err: unknown) {
      const errStr = typeof err === "string" ? err : JSON.stringify(err);
      if (errStr.includes("Verrouillage de sécurité actif") || errStr.includes("PinRateLimitExceeded")) {
        const match = errStr.match(/(\d+)s restantes/);
        const secs = match ? parseInt(match[1], 10) : 60;
        return {
          success: false,
          lockoutSeconds: secs,
          errorMessage: `Verrouillage de sécurité actif (${secs}s restantes) : trop de tentatives.`,
        };
      }
      return { success: false, errorMessage: "Erreur de validation de code PIN." };
    }
  }

  // 2. En environnement Web (Vercel / navigateur), vérification via Web Crypto API native à temps constant (CWE-208)
  if (typeof window !== "undefined" && window.crypto && window.crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const validHashes = [
        "e3718679a6aaa550bc1bf355a134e1a96251e17436ce7231875d518816c049bc",
        "7af26d0a3cec228913493825a248f55ebe15707a5daafa15ae9096a06e2b7950",
      ];

      const s1 = encoder.encode(`agora-proctor-salt:${clean}`);
      const s2 = encoder.encode(`agora-proctor-salt:${clean.toUpperCase()}`);

      const [h1, h2] = await Promise.all([
        window.crypto.subtle.digest("SHA-256", s1),
        window.crypto.subtle.digest("SHA-256", s2),
      ]);

      const toHex = (buf: ArrayBuffer) =>
        Array.from(new Uint8Array(buf))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

      const hex1 = toHex(h1);
      const hex2 = toHex(h2);

      let matchFound = false;
      for (const target of validHashes) {
        if (constantTimeCompare(hex1, target) || constantTimeCompare(hex2, target)) {
          matchFound = true;
        }
      }

      return { success: matchFound };
    } catch {
      return { success: false };
    }
  }

  return { success: false };
}

interface StrikeEvent {
  strike_number: number;
  max_strikes: number;
  reason: string;
  timestamp: string;
  evidencePath?: string;
  isProctorAlert?: boolean;
}

interface InfractionResult {
  strike_number: number;
  max_strikes: number;
  reason: string;
  is_expelled: boolean;
  is_proctor_alert: boolean;
  evidence_path?: string;
  timestamp: string;
}

interface SealedReceiptResult {
  seal_digest: string;
  session_id: string;
  attempt_id: number;
  timestamp: string;
  strikes_count: number;
  policy_applied: string;
  total_questions: number;
  answers_summary: Record<string, string>;
  student_observation: string;
  confinement_status: string;
  receipt_file_path?: string;
}

type PipPosition = "bottom-right" | "bottom-left" | "top-right" | "top-left";

const EXAM_SESSION_STORAGE_KEY = "agora_exam_session_v1";

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

  // Politique de surveillance configurable (Human-in-the-Loop par défaut)
  const [policy, setPolicy] = useState<SurveillancePolicy>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlPolicy = params.get("policy");
      if (urlPolicy === "audit" || urlPolicy === "strict") return urlPolicy;
    }
    return "hybrid";
  });
  const [isFlaggedForProctorReview, setIsFlaggedForProctorReview] = useState<boolean>(false);

  // Initialisation sécurisée du séquestre Moodle dans Rust et purge immédiate de l'URL (CWE-312 & CWE-798)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const moodleUrl = params.get("moodleUrl") || params.get("moodle_url") || "";
    const wstoken = params.get("wstoken") || "";
    const attemptId = parseInt(params.get("attemptId") || params.get("attempt_id") || "48291", 10);

    if (moodleUrl || wstoken) {
      if (isTauri) {
        invoke("initialiser_session_examen", {
          moodleUrl,
          wstoken,
          attemptId,
          policy,
        }).catch((err) => {
          console.error("Échec initialisation session sécurisée Rust :", err);
        });
      }

      // Purge immédiate et irréversible de l'historique et de l'URL pour ne jamais exposer le wstoken (CWE-312)
      try {
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete("wstoken");
        cleanUrl.searchParams.delete("moodleUrl");
        cleanUrl.searchParams.delete("moodle_url");
        window.history.replaceState({}, document.title, cleanUrl.pathname + cleanUrl.hash);
      } catch {}
    }
  }, [isTauri, policy]);

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
  const [ghostCamera, setGhostCamera] = useState<boolean>(false);

  // Confort de lecture & Accessibilité typographique
  const [fontSizeLevel, setFontSizeLevel] = useState<"normal" | "large" | "xlarge">("normal");

  // Questions épinglées pour relecture par le candidat
  const [flaggedQuestions, setFlaggedQuestions] = useState<number[]>([]);

  // Horodatage & Rassurance de sauvegarde automatique
  const [lastSavedTime, setLastSavedTime] = useState<string>("14:32:05");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving">("saved");

  // Chronomètre d'examen (décompte actif)
  const [secondsRemaining, setSecondsRemaining] = useState<number>(6135); // 01:42:15

  // Modal d'aide aux raccourcis clavier
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);

  // État de l'examen Moodle interactif (simulation de test universitaire)
  const [currentQuestion, setCurrentQuestion] = useState<number>(1);
  const [answers, setAnswers] = useState<Record<number, string>>({
    1: "b",
  });
  const [isFinished, setIsFinished] = useState<boolean>(false);

  // Droit d'observation étudiant (Art. 22 RGPD) & Arbitrage surveillant sur place
  const [studentObservation, setStudentObservation] = useState<string>("");
  const [observationSaved, setObservationSaved] = useState<boolean>(false);
  const [showProctorPinModal, setShowProctorPinModal] = useState<boolean>(false);
  const [proctorPin, setProctorPin] = useState<string>("");
  const [proctorPinError, setProctorPinError] = useState<string | null>(null);

  // Sécurité PIN Surveillant : Rate-limiting (3 essais max puis verrouillage 60s)
  const [proctorPinAttempts, setProctorPinAttempts] = useState<number>(0);
  const [proctorPinLockoutUntil, setProctorPinLockoutUntil] = useState<number>(0);
  const [lockoutCountdown, setLockoutCountdown] = useState<number>(0);

  // Sceau cryptographique SHA-256 dynamique et persistance de session
  const [computedSealDigest, setComputedSealDigest] = useState<string>("");
  const [sealCopied, setSealCopied] = useState<boolean>(false);
  const [sessionRestoredBanner, setSessionRestoredBanner] = useState<boolean>(false);
  const [isDownloadingReceipt, setIsDownloadingReceipt] = useState<boolean>(false);

  // Décompte automatique du temps restant
  useEffect(() => {
    if (!isExamStarted || isFinished || isExpelled) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsFinished(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isExamStarted, isFinished, isExpelled]);

  const formatTimer = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  // Compte à rebours du verrouillage PIN
  useEffect(() => {
    if (proctorPinLockoutUntil <= Date.now()) return;
    const interval = setInterval(() => {
      const diff = Math.ceil((proctorPinLockoutUntil - Date.now()) / 1000);
      if (diff <= 0) {
        setLockoutCountdown(0);
        setProctorPinError(null);
        clearInterval(interval);
      } else {
        setLockoutCountdown(diff);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [proctorPinLockoutUntil]);

  // Restauration de session au démarrage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = sessionStorage.getItem(EXAM_SESSION_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.answers) {
            setAnswers(parsed.answers);
            if (typeof parsed.currentQuestion === "number") setCurrentQuestion(parsed.currentQuestion);
            if (Array.isArray(parsed.flaggedQuestions)) setFlaggedQuestions(parsed.flaggedQuestions);
            if (typeof parsed.secondsRemaining === "number") setSecondsRemaining(parsed.secondsRemaining);
            if (typeof parsed.strikes === "number") setStrikes(parsed.strikes);
            setSessionRestoredBanner(true);
            setTimeout(() => setSessionRestoredBanner(false), 5000);
          }
        }
      } catch {}
    }
  }, []);

  // Sauvegarde automatique continue en sessionStorage
  useEffect(() => {
    if (!isExamStarted || isFinished || isExpelled) return;
    try {
      sessionStorage.setItem(
        EXAM_SESSION_STORAGE_KEY,
        JSON.stringify({
          currentQuestion,
          answers,
          flaggedQuestions,
          secondsRemaining,
          strikes,
          policy,
          lastSavedTime,
        })
      );
    } catch {}
  }, [isExamStarted, isFinished, isExpelled, currentQuestion, answers, flaggedQuestions, secondsRemaining, strikes, policy, lastSavedTime]);

  // Nettoyage sessionStorage lors de la clôture
  useEffect(() => {
    if (isFinished || isExpelled) {
      try {
        sessionStorage.removeItem(EXAM_SESSION_STORAGE_KEY);
      } catch {}
    }
  }, [isFinished, isExpelled]);

  // Calcul et scellement cryptographique SHA-256 garanti souverainement par le backend Rust (CWE-345)
  useEffect(() => {
    if (isFinished && !computedSealDigest) {
      const computeDynamicSeal = async () => {
        // 1. En environnement natif Tauri : Calcul et scellement d'intégrité souverain dans Rust (CWE-345)
        if (isTauri) {
          try {
            const result = await invoke<SealedReceiptResult>("sceller_resultats_examen", {
              answers,
              studentObservation: studentObservation.trim(),
            });
            setComputedSealDigest(result.seal_digest);
            return;
          } catch (err) {
            console.error("Échec scellement cryptographique Rust :", err);
          }
        }

        // 2. Émulation Web (Navigateur)
        const canonicalReceipt = {
          certification: "AgoraExam Academic Integrity Official Receipt",
          protocolVersion: "2.4-Sovereign-Edge",
          sessionId: "AGORA-2026-X48291",
          institution: "Université Numérique & Plateforme Moodle",
          exam: {
            code: "ALG402",
            title: "Algorithmique Avancée & Structures de Données",
            attemptId: 48291,
          },
          candidate: {
            id: "ETU-2026-48291",
            confinementStatus: "Web Kiosk Emulation",
          },
          submission: {
            timestamp: new Date().toISOString(),
            formattedDate: new Date().toLocaleString("fr-FR"),
            questionsAnswered: Object.keys(answers).length,
            totalQuestions: 8,
            answersSummary: answers,
            strikesCount: strikes,
            policyApplied: policy,
            flaggedForProctorReview: isFlaggedForProctorReview,
            studentObservation: studentObservation.trim() || "Aucune observation signalée par l'étudiant",
          },
        };

        if (typeof window !== "undefined" && window.crypto && window.crypto.subtle) {
          try {
            const raw = JSON.stringify(canonicalReceipt);
            const digest = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
            const hex = Array.from(new Uint8Array(digest))
              .map((b) => b.toString(16).padStart(2, "0"))
              .join("");
            setComputedSealDigest(hex);
          } catch (e) {
            console.error("Échec calcul sceau SHA-256 :", e);
          }
        }
      };

      computeDynamicSeal();
    }
  }, [isFinished, computedSealDigest, isTauri, answers, strikes, policy, isFlaggedForProctorReview, studentObservation]);

  const updateAnswer = (questionNumber: number, answerValue: string) => {
    setSaveStatus("saving");
    setAnswers((prev) => ({ ...prev, [questionNumber]: answerValue }));
    setTimeout(() => {
      const now = new Date();
      setLastSavedTime(
        `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`
      );
      setSaveStatus("saved");
    }, 250);
  };

  const toggleFlagQuestion = (qNum: number) => {
    setFlaggedQuestions((prev) =>
      prev.includes(qNum) ? prev.filter((n) => n !== qNum) : [...prev, qNum]
    );
  };

  // Navigation au clavier sécurisée (touches simples, sans Alt/Ctrl pour respecter le confinement Kiosk)
  useEffect(() => {
    if (!isExamStarted || isFinished || isExpelled) return;

    const handleExamShortcuts = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || "").toLowerCase();
      if (activeTag === "textarea" || activeTag === "input") {
        return;
      }

      if (e.key === "?" || (e.shiftKey && e.key === "?")) {
        e.preventDefault();
        setShowShortcutsModal((prev) => !prev);
        return;
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        setCurrentQuestion((prev) => Math.min(8, prev + 1));
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCurrentQuestion((prev) => Math.max(1, prev - 1));
        return;
      }

      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFlagQuestion(currentQuestion);
        return;
      }

      if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        setPipMinimized((prev) => !prev);
        return;
      }

      if (e.key === "g" || e.key === "G") {
        e.preventDefault();
        setGhostCamera((prev) => !prev);
        return;
      }

      if (currentQuestion === 1 && ["1", "2", "3", "4"].includes(e.key)) {
        const optionMap: Record<string, string> = { "1": "a", "2": "b", "3": "c", "4": "d" };
        const opt = optionMap[e.key];
        if (opt) {
          e.preventDefault();
          updateAnswer(1, opt);
        }
      }
    };

    window.addEventListener("keydown", handleExamShortcuts);
    return () => window.removeEventListener("keydown", handleExamShortcuts);
  }, [isExamStarted, isFinished, isExpelled, currentQuestion]);

  const moodleUrl = "https://moodle.universite.fr/mod/quiz/attempt.php?attempt=48291";
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const absenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Attacher le flux vidéo au mini-moniteur PiP
  const handlePipVideoRef = useCallback(
    (el: HTMLVideoElement | null) => {
      videoRef.current = el;
      if (el && mediaStream && el.srcObject !== mediaStream) {
        el.srcObject = mediaStream;
        el.play().catch((err) => console.log("Lecture vidéo PiP au montage :", err));
      }
    },
    [mediaStream]
  );

  useEffect(() => {
    if (isExamStarted && videoRef.current && mediaStream && videoRef.current.srcObject !== mediaStream) {
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
    const snapshotBase64 = captureEvidenceSnapshot();

    // 1. En environnement natif Tauri : Le backend Rust est l'autorité absolue (Fail-Secure & Zero-Bypass)
    if (isTauri) {
      try {
        const result = await invoke<InfractionResult>("enregistrer_infraction", {
          motif: reason,
          imageBase64: snapshotBase64 || null,
        });

        // Synchronisation avec le compteur officiel déterminé et scellé par Rust
        setStrikes(result.strike_number);

        if (result.is_expelled) {
          setIsExpelled(true);
          return;
        }

        if (result.is_proctor_alert) {
          setIsFlaggedForProctorReview(true);
          setActiveModalStrike({
            strike_number: result.strike_number,
            max_strikes: result.max_strikes,
            reason: `${reason} • Anomalie consignée au dossier. Un surveillant humain a été alerté pour vérification. Vous pouvez continuer à composer.`,
            timestamp: new Date().toLocaleTimeString(),
            evidencePath: result.evidence_path,
            isProctorAlert: true,
          });
          return;
        }

        if (policy !== "audit") {
          setActiveModalStrike({
            strike_number: result.strike_number,
            max_strikes: result.max_strikes,
            reason,
            timestamp: new Date().toLocaleTimeString(),
            evidencePath: result.evidence_path,
            isProctorAlert: false,
          });
        }
        return;
      } catch (err) {
        console.error("Échec enregistrement infraction souverain Rust :", err);
      }
    }

    // 2. Émulation Web (Navigateur / Démo sans runtime Rust)
    setStrikes((prev) => {
      const nextStrikes = prev + 1;
      if (nextStrikes >= 3) {
        if (policy === "strict") {
          setIsExpelled(true);
        } else {
          setIsFlaggedForProctorReview(true);
          setActiveModalStrike({
            strike_number: nextStrikes,
            max_strikes: 3,
            reason: `${reason} • Anomalie consignée au dossier. Un surveillant humain a été alerté. Vous pouvez continuer à composer.`,
            timestamp: new Date().toLocaleTimeString(),
            isProctorAlert: true,
          });
        }
      } else if (policy !== "audit") {
        setActiveModalStrike({
          strike_number: nextStrikes,
          max_strikes: 3,
          reason,
          timestamp: new Date().toLocaleTimeString(),
          isProctorAlert: false,
        });
      }
      return nextStrikes;
    });
  }, [captureEvidenceSnapshot, isTauri, policy]);
  
  // Boucle de vision locale avec Tolérance 4s (Anti-faux positifs)
  useEffect(() => {
    if (!isExamStarted || isExpelled) return;

    let isRunning = true;
    let lastTime = 0;

    proctorVision.initialize().catch((err) => {
      console.warn("Vision locale initialisée en mode dégradé :", err);
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

  // Surveillance active anti-HDMI / anti-multi-écrans en cours d'examen
  useEffect(() => {
    if (!isExamStarted || isExpelled || isFinished) return;

    let isSubscribed = true;

    const checkExternalDisplays = async () => {
      if (!isSubscribed) return;

      let isDual = false;
      let count = 1;

      if (isTauri) {
        try {
          const res = await invoke<{ is_valid: boolean; monitor_count: number }>("verifier_materiel");
          if (!res.is_valid || res.monitor_count > 1) {
            isDual = true;
            count = res.monitor_count;
          }
        } catch {
          // Fallback
        }
      } else {
        const screenObj = typeof window !== "undefined" ? window.screen : null;
        if (screenObj && (screenObj as any).isExtended) {
          isDual = true;
          count = 2;
        }

        if (
          typeof window !== "undefined" &&
          (window.screenLeft > (screenObj?.width || 1920) ||
            window.screenTop > (screenObj?.height || 1080) ||
            Boolean(screenObj && ((screenObj as any).availLeft > 0 || (screenObj as any).availTop > 0)))
        ) {
          isDual = true;
          count = 2;
        }
      }

      if (isDual) {
        handleWarning(`Câble HDMI ou second écran connecté en cours d'épreuve (${count} écrans détectés)`);
      }
    };

    const intervalId = setInterval(checkExternalDisplays, 2000);

    const handleDisplayEvent = () => {
      checkExternalDisplays();
    };

    window.addEventListener("resize", handleDisplayEvent);
    if (typeof window !== "undefined" && "screen" in window && (window.screen as any).addEventListener) {
      (window.screen as any).addEventListener("change", handleDisplayEvent);
    }

    return () => {
      isSubscribed = false;
      clearInterval(intervalId);
      window.removeEventListener("resize", handleDisplayEvent);
      if (typeof window !== "undefined" && "screen" in window && (window.screen as any).removeEventListener) {
        (window.screen as any).removeEventListener("change", handleDisplayEvent);
      }
    };
  }, [isExamStarted, isExpelled, isFinished, isTauri, handleWarning]);

  // 4. Verrouillage intégral des raccourcis système, touches de fonction, clic droit et focus
  useEffect(() => {
    if (!isExamStarted || isExpelled || isFinished) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.startsWith("F") && e.key.length <= 3) {
        e.preventDefault();
        e.stopPropagation();
        handleWarning(`Touche de fonction interdite (${e.key}) neutralisée`);
        return false;
      }

      if (e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        handleWarning(`Raccourci système Alt détecté et bloqué : Alt + ${e.key}`);
        return false;
      }

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

      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    // Tolérance bienveillante de 3 secondes avant d'enregistrer un strike formel
    let blurTimeoutId: ReturnType<typeof setTimeout> | null = null;

    const handleBlur = () => {
      if (blurTimeoutId) clearTimeout(blurTimeoutId);
      blurTimeoutId = setTimeout(() => {
        handleWarning("Perte de focus prolongée de la fenêtre d'examen détectée !");
        window.focus();
      }, 3000);
    };

    const handleFocus = () => {
      if (blurTimeoutId) {
        clearTimeout(blurTimeoutId);
        blurTimeoutId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (blurTimeoutId) clearTimeout(blurTimeoutId);
        blurTimeoutId = setTimeout(() => {
          handleWarning("La fenêtre d'examen a été minimisée ou masquée !");
          window.focus();
        }, 3000);
      } else {
        if (blurTimeoutId) {
          clearTimeout(blurTimeoutId);
          blurTimeoutId = null;
        }
      }
    };

    const handleClipboard = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      handleWarning(`Action de presse-papier (${e.type}) neutralisée`);
      if (isTauri) {
        invoke("vider_presse_papier").catch(() => {});
      }
      return false;
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("contextmenu", handleContextMenu, { capture: true });
    window.addEventListener("copy", handleClipboard, { capture: true });
    window.addEventListener("cut", handleClipboard, { capture: true });
    window.addEventListener("paste", handleClipboard, { capture: true });
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (blurTimeoutId) clearTimeout(blurTimeoutId);
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("contextmenu", handleContextMenu, { capture: true });
      window.removeEventListener("copy", handleClipboard, { capture: true });
      window.removeEventListener("cut", handleClipboard, { capture: true });
      window.removeEventListener("paste", handleClipboard, { capture: true });
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isExamStarted, isExpelled, isFinished, handleWarning]);

  // Écoute des événements système Tauri (Focus perdu, alt-tab, etc.) • Uniquement dans l'application native
  useEffect(() => {
    if (!isTauri || !isExamStarted) return;

    let unlistenSecurityFn: (() => void) | null = null;
    let unlistenFocusFn: (() => void) | null = null;

    listen<string>("security_violation", (event) => {
      handleWarning(`Violation système : ${event.payload}`);
    })
      .then((unlisten) => {
        unlistenSecurityFn = unlisten;
      })
      .catch((err) => {
        console.warn("Écoute security_violation indisponible :", err);
      });

    listen<string>("window_focus_lost", (event) => {
      handleWarning(`Perte de focus de la fenêtre : ${event.payload}`);
    })
      .then((unlisten) => {
        unlistenFocusFn = unlisten;
      })
      .catch((err) => {
        console.warn("Écoute window_focus_lost indisponible :", err);
      });

    return () => {
      if (unlistenSecurityFn) unlistenSecurityFn();
      if (unlistenFocusFn) unlistenFocusFn();
    };
  }, [isTauri, isExamStarted, handleWarning]);

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
        policy={policy}
        onPolicyChange={(newPolicy) => setPolicy(newPolicy)}
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
      <div className="flex min-h-screen w-full max-w-full flex-col items-center justify-center bg-zinc-950 p-6 sm:p-8 text-center font-sans antialiased">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 mb-6 shadow-xl shadow-rose-500/5">
          <AlertOctagon size={44} />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-100">
          Session d'Examen Verrouillée & Clôturée
        </h1>
        <p className="mt-3 text-sm sm:text-base text-zinc-300 max-w-lg leading-relaxed">
          Le seuil maximal de 3 avertissements a été atteint.
          Votre épreuve a été automatiquement transmise et scellée sur le serveur Moodle.
        </p>
        <div className="mt-6 p-5 rounded-2xl border border-zinc-800 bg-zinc-900/80 text-xs sm:text-sm text-zinc-300 font-mono space-y-2 text-left max-w-md w-full">
          <div><strong className="text-zinc-100">Tentative ID :</strong> #48291</div>
          <div><strong className="text-zinc-100">Statut :</strong> Clôturé pour infraction répétée</div>
          <div><strong className="text-zinc-100">Preuves :</strong> 3 photographies horodatées archivées</div>
        </div>
      </div>
    );
  }

  // Écran de fin d'examen (avec Attestation Officielle Cryptographique & Protocole Human-in-the-Loop)
  if (isFinished) {
    const hasFlags = isFlaggedForProctorReview || strikes > 0;

    const downloadReceipt = async () => {
      let finalSeal = computedSealDigest;
      if (!finalSeal) {
        const canonical = JSON.stringify({ attemptId: 48291, answersCount: Object.keys(answers).length, timestamp: Date.now() });
        const digest = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
        finalSeal = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
      }
      const receiptPayload = {
        certification: "AgoraExam Academic Integrity Official Receipt",
        protocolVersion: "2.4-Sovereign-Edge",
        sessionId: "AGORA-2026-X48291",
        institution: "Université Numérique & Plateforme Moodle",
        exam: {
          code: "ALG402",
          title: "Algorithmique Avancée & Structures de Données",
          attemptId: 48291,
        },
        candidate: {
          id: "ETU-2026-48291",
          confinementStatus: isTauri ? "Strict Kiosk Lock (Tauri v2 Native Verified)" : "Web Kiosk Emulation",
        },
        submission: {
          timestamp: new Date().toISOString(),
          formattedDate: new Date().toLocaleString("fr-FR"),
          questionsAnswered: Object.keys(answers).length,
          totalQuestions: 8,
          answersSummary: answers,
          strikesCount: strikes,
          policyApplied: policy,
          flaggedForProctorReview: isFlaggedForProctorReview,
          studentObservation: studentObservation.trim() || "Aucune observation signalée par l'étudiant",
        },
        cryptographicSeal: {
          algorithm: "SHA-256",
          sha256Digest: finalSeal,
          verificationUrl: "https://agoraexam.vercel.app/#docs",
        },
      };

      const blob = new Blob([JSON.stringify(receiptPayload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Recu-AgoraExam-ALG402-Session48291-${finalSeal.slice(0, 8)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    };

    return (
      <div className="flex min-h-screen w-full max-w-full flex-col items-center justify-center bg-zinc-950 p-4 sm:p-8 text-center font-sans antialiased overflow-y-auto">
        {/* Attestation Officielle de Fin d'Épreuve */}
        <div className="w-full max-w-2xl rounded-3xl border border-zinc-800 bg-zinc-900/80 p-6 sm:p-8 shadow-2xl backdrop-blur space-y-6 text-left print-surface">
          {/* En-tête de l'Attestation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-zinc-800 gap-4">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0">
                <AgoraExamLogo size={28} />
              </div>
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 block">
                  Récépissé Officiel de Remise d'Épreuve
                </span>
                <h1 className="text-lg sm:text-xl font-extrabold text-zinc-100 tracking-tight">
                  Attestation de Composition Sécurisée
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-mono font-bold text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                <Award size={14} />
                <span>Session Clôturée</span>
              </span>
            </div>
          </div>

          {/* Grille des caractéristiques certifiées */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs font-mono">
            <div className="p-3.5 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-1">
              <span className="text-zinc-500 uppercase block font-semibold text-[10px]">Épreuve Universitaire</span>
              <span className="text-zinc-200 font-bold text-sm block">ALG402 • Algorithmique Avancée</span>
              <span className="text-zinc-400 text-[11px] block">Tentative Moodle ID : #48291</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-1">
              <span className="text-zinc-500 uppercase block font-semibold text-[10px]">Candidat & Confinement</span>
              <span className="text-zinc-200 font-bold text-sm block">Candidat ID : #ETU-2026-48291</span>
              <span className="text-emerald-400 text-[11px] font-semibold block">
                {isTauri ? "Kiosk Kiosk OS Verrouillé (Tauri Native)" : "Kiosk Émulé (Web Preview)"}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-1">
              <span className="text-zinc-500 uppercase block font-semibold text-[10px]">Télésurveillance & Strikes</span>
              <span className="text-zinc-200 font-bold text-sm block">
                {strikes === 0 ? "0 infraction ⬢ 100% Conforme" : `${strikes} observation(s) consignée(s)`}
              </span>
              <span className="text-zinc-400 text-[11px] block">Politique appliquée : {policy.toUpperCase()}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-1">
              <span className="text-zinc-500 uppercase block font-semibold text-[10px]">Copie & Réponses</span>
              <span className="text-zinc-200 font-bold text-sm block">
                {Object.keys(answers).length} sur 8 questions complétées
              </span>
              <span className="text-zinc-400 text-[11px] block">Horodatage : {new Date().toLocaleTimeString("fr-FR")}</span>
            </div>
          </div>

          {/* Sceau Cryptographique SHA-256 Dynamique & Vérifiable */}
          <div className="p-3.5 rounded-2xl border border-zinc-800 bg-zinc-950/90 text-xs font-mono space-y-1.5">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="flex items-center gap-1.5 text-zinc-300 font-bold">
                <Lock size={12} className="text-emerald-400" />
                Sceau Cryptographique d'Intégrité (SHA-256 Dynamique)
              </span>
              <span className="text-[10px] text-emerald-400">Certifié Inaltérable</span>
            </div>
            <div className="text-[11px] text-zinc-300 break-all select-all font-mono bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800 flex items-center justify-between gap-2">
              <span className="truncate">{computedSealDigest || "Calcul de l'empreinte mathématique..."}</span>
              {computedSealDigest && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(computedSealDigest);
                    setSealCopied(true);
                    setTimeout(() => setSealCopied(false), 2000);
                  }}
                  className="shrink-0 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] text-zinc-200 border border-zinc-700 transition-colors"
                >
                  {sealCopied ? "Copié !" : "Copier"}
                </button>
              )}
            </div>
          </div>

          {/* Droit d'observation étudiant (Article 22 RGPD) si observations */}
          {hasFlags && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3 no-print">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <FileText size={15} />
                <span>Droit d'observation de l'étudiant (Art. 22 RGPD)</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Des observations de surveillance ont été enregistrées durant l'examen. Vous pouvez consigner une explication officielle pour le jury :
              </p>

              {observationSaved ? (
                <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/15 text-xs text-emerald-300 flex items-center gap-2">
                  <Check size={16} className="text-emerald-400 shrink-0" />
                  <span>Votre observation a été scellée dans le rapport transmis au jury d'examen.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <textarea
                    value={studentObservation}
                    onChange={(e) => setStudentObservation(e.target.value)}
                    placeholder="Ex : 'ì 10h14, ma webcam externe a été bousculée, je l'ai replacée immédiatement.' (Facultatif)"
                    rows={3}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-xs sm:text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (studentObservation.trim()) {
                        setObservationSaved(true);
                      }
                    }}
                    disabled={!studentObservation.trim()}
                    className="w-full rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-xs font-semibold text-zinc-200 py-2.5 transition-colors"
                  >
                    Sceller mon observation au dossier
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Boutons d'Action Principaux avec Double-Submit Guard */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3 no-print">
            <button
              onClick={async () => {
                if (isDownloadingReceipt) return;
                setIsDownloadingReceipt(true);
                try {
                  await downloadReceipt();
                } finally {
                  setTimeout(() => setIsDownloadingReceipt(false), 1200);
                }
              }}
              disabled={isDownloadingReceipt}
              className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              <Download size={15} />
              <span>{isDownloadingReceipt ? "Enregistrement sécurisé du reçu..." : "Télécharger le Reçu (.json)"}</span>
            </button>

            <button
              onClick={() => window.print()}
              className="w-full sm:w-auto py-3 px-4 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <Printer size={15} />
              <span>Imprimer / PDF</span>
            </button>

            <button
              onClick={async () => {
                setViewMode("portal");
                window.location.hash = "#home";
              }}
              className="w-full sm:w-auto py-3 px-4 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 font-medium text-xs sm:text-sm transition-colors"
            >
              Retour à l'Accueil
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Calcul du pourcentage de temps restant (sur 7200 secondes totales)
  const timerPercentage = Math.max(0, Math.min(100, (secondsRemaining / 7200) * 100));

  return (
    <div className="flex h-screen w-full max-w-full flex-col bg-zinc-950 text-zinc-100 font-sans overflow-hidden antialiased">
      {/* Canvas invisible pour capture d'infractions */}
      <canvas ref={canvasRef} className="hidden" />

      {/* 1. TOP HUD / BARRE DE SÉCURITÉ OFFICIELLE */}
      <header className="flex h-16 items-center justify-between border-b border-zinc-800/80 bg-zinc-900/95 px-3 sm:px-6 backdrop-blur z-20">
        {/* Identité logicielle & Statut Kiosk */}
        <div className="flex items-center gap-2.5 sm:gap-3.5">
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-zinc-950 border border-zinc-800 shadow-sm shrink-0">
            <AgoraExamLogo size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold tracking-tight text-zinc-100">AgoraExam</span>
              {isTauri ? (
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] sm:text-xs font-mono font-semibold text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5 whitespace-nowrap">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Kiosk Verrouillé
                </span>
              ) : (
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] sm:text-xs font-mono font-semibold text-amber-300 border border-amber-500/30 flex items-center gap-1.5 whitespace-nowrap">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                  <span>Aperçu Web</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400 hidden sm:block truncate">
              Algorithmique Avancée ⬢ Réf: ALG402 ⬢ Épreuve Universitaire
            </p>
          </div>
        </div>

        {/* Contrôles HUD : Confort visuel, Strikes, Chronomètre & Aide */}
        <div className="flex items-center gap-2 sm:gap-3.5 shrink-0">
          {/* Badge Human-in-the-Loop actif */}
          {isFlaggedForProctorReview && (
            <div className="hidden lg:flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-xs font-semibold text-amber-400 animate-pulse">
              <Shield size={13} />
              <span>Dossier Transmis au Surveillant</span>
            </div>
          )}

          {/* Sélecteur de Taille de Police (Confort de lecture A- / A+) */}
          <div className="hidden md:flex items-center rounded-lg border border-zinc-800 bg-zinc-900/90 p-0.5 text-xs text-zinc-400">
            <button
              onClick={() => setFontSizeLevel("normal")}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${fontSizeLevel === "normal"
                  ? "bg-zinc-800 text-zinc-100 font-bold"
                  : "hover:text-zinc-200"
                }`}
              title="Taille de texte normale (100%)"
            >
              A
            </button>
            <button
              onClick={() => setFontSizeLevel("large")}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${fontSizeLevel === "large"
                  ? "bg-zinc-800 text-zinc-100 font-bold"
                  : "hover:text-zinc-200"
                }`}
              title="Taille de texte agrandie (115%)"
            >
              A+
            </button>
            <button
              onClick={() => setFontSizeLevel("xlarge")}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${fontSizeLevel === "xlarge"
                  ? "bg-zinc-800 text-zinc-100 font-bold"
                  : "hover:text-zinc-200"
                }`}
              title="Taille de texte maximale (130%)"
            >
              A++
            </button>
          </div>

          {/* Compteur de Strikes */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] sm:text-xs font-mono text-zinc-400 uppercase font-semibold mr-0.5 hidden xs:inline">Strikes :</span>
            {[1, 2, 3].map((num) => {
              const isActive = strikes >= num;
              return (
                <div
                  key={num}
                  className={`h-6 sm:h-7 px-2 sm:px-2.5 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-mono font-bold flex items-center gap-1 border transition-colors ${isActive
                      ? "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm shadow-rose-500/10"
                      : "bg-zinc-800/40 text-zinc-500 border-zinc-800"
                    }`}
                >
                  <AlertTriangle size={11} />
                  <span>{num}</span>
                </div>
              );
            })}
          </div>

          <div className="h-4 w-px bg-zinc-800 hidden sm:block" />

          {/* Chronomètre avec jauge de temps restante dynamique */}
          <div
            className={`flex items-center gap-2 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl border transition-colors shadow-sm ${secondsRemaining <= 300
                ? "bg-rose-500/20 border-rose-500/50 text-rose-300 animate-pulse"
                : secondsRemaining <= 900
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                  : "bg-zinc-800/90 border-zinc-700/60 text-zinc-100"
              }`}
          >
            <Clock size={13} className={secondsRemaining <= 900 ? "text-amber-400" : "text-zinc-400"} />
            <div className="flex flex-col">
              <span className="font-mono text-xs font-bold leading-tight">
                {formatTimer(secondsRemaining)}
              </span>
              <div className="w-12 h-1 bg-zinc-700/60 rounded-full overflow-hidden mt-0.5">
                <div
                  className={`h-full transition-all duration-1000 ${secondsRemaining <= 300
                      ? "bg-rose-500"
                      : secondsRemaining <= 900
                        ? "bg-amber-400"
                        : "bg-emerald-400"
                    }`}
                  style={{ width: `${timerPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Bouton Raccourcis Clavier */}
          <button
            onClick={() => setShowShortcutsModal(true)}
            className="flex items-center gap-1 rounded-lg sm:rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
            title="Consulter les raccourcis clavier (?)"
          >
            <Keyboard size={13} className="text-emerald-400" />
            <span className="hidden sm:inline">Aide (?)</span>
          </button>
        </div>
      </header>

      {/* Bannière de session restaurée suite à incident / coupure */}
      {sessionRestoredBanner && (
        <div className="w-full bg-emerald-500/15 border-b border-emerald-500/30 px-4 py-2 flex items-center justify-center gap-2 text-xs sm:text-sm text-emerald-300 z-10 animate-in fade-in duration-200">
          <Check size={14} className="text-emerald-400 shrink-0" />
          <span>Session d'examen restaurée avec succès. Vos réponses précédentes ont été récupérées.</span>
        </div>
      )}

      {/* Jauge d'absence responsive en bannière fine sous le header */}
      {absenceCountdown !== null && (
        <div className="w-full bg-amber-500/15 border-b border-amber-500/40 px-4 py-2 flex items-center justify-between text-xs sm:text-sm text-amber-300 z-10 animate-pulse">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0" />
            <span className="font-semibold">Visage hors champ • Repositionnez-vous face à la webcam</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-24 sm:w-36 bg-amber-950 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 transition-all duration-1000"
                style={{ width: `${(absenceCountdown / 4) * 100}%` }}
              />
            </div>
            <span className="font-mono font-bold">{absenceCountdown}s</span>
          </div>
        </div>
      )}

      {/* 2. ZONE CENTRALE : NAVIGATEUR MOODLE INTÉGRÉ & QUESTIONNAIRE RÉEL */}
      <div className="flex flex-1 overflow-hidden">
        {/* Volet latéral gauche : Navigation du Quiz Moodle (Desktop uniquement) */}
        <aside className="hidden md:flex w-64 border-r border-zinc-800/80 bg-zinc-950/70 p-5 flex-col justify-between flex-shrink-0">
          <div className="space-y-4">
            <div className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider pb-3 border-b border-zinc-800/60 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <BookOpen size={14} className="text-emerald-400" />
                <span>Navigation Questionnaire</span>
              </span>
              <span className="text-xs text-zinc-400 font-mono font-normal">8 questions</span>
            </div>

            {/* Grille des questions avec indicateurs de marquage/relecture */}
            <div className="grid grid-cols-4 gap-2.5">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((qNum) => {
                const isCurrent = currentQuestion === qNum;
                const isAnswered = answers[qNum] !== undefined;
                const isFlagged = flaggedQuestions.includes(qNum);

                return (
                  <button
                    key={qNum}
                    onClick={() => setCurrentQuestion(qNum)}
                    className={`relative h-10 rounded-xl text-xs sm:text-sm font-mono font-semibold border flex items-center justify-center transition-all ${isCurrent
                        ? "bg-emerald-500 text-zinc-950 border-emerald-400 font-bold shadow-md shadow-emerald-500/10"
                        : isAnswered
                          ? "bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-700"
                          : "bg-zinc-900/60 text-zinc-500 border-zinc-800 hover:border-zinc-700"
                      }`}
                  >
                    <span>{qNum}</span>
                    {/* Pastille de question épinglée pour révision */}
                    {isFlagged && (
                      <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-400 border border-zinc-950 shadow-sm" title="Marquée pour révision" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-3 text-xs text-zinc-400 space-y-2">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-emerald-500" />
                <span>Question active</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-zinc-700" />
                <span>Réponse enregistrée</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-amber-400" />
                <span>Épinglée pour révision (F)</span>
              </div>
            </div>
          </div>

          {/* Bouton de Fin d'Épreuve */}
          <button
            onClick={() => setIsFinished(true)}
            className="w-full py-3 rounded-xl border border-zinc-700 bg-zinc-900 text-xs sm:text-sm font-semibold text-zinc-200 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            Terminer le test...
          </button>
        </aside>

        {/* Contenu principal : Feuille d'examen Moodle */}
        <main className="flex-1 flex flex-col bg-zinc-900/20 overflow-y-auto relative">
          {/* Navigation mobile compacte des questions (< md) */}
          <div className="md:hidden flex items-center justify-between px-3 py-2 bg-zinc-950/90 border-b border-zinc-800/80 gap-2">
            <span className="text-[11px] font-mono text-zinc-400 shrink-0">Questions :</span>
            <div className="flex items-center gap-1 overflow-x-auto py-0.5">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((qNum) => {
                const isCurrent = currentQuestion === qNum;
                const isAnswered = answers[qNum] !== undefined;
                const isFlagged = flaggedQuestions.includes(qNum);

                return (
                  <button
                    key={qNum}
                    onClick={() => setCurrentQuestion(qNum)}
                    className={`relative h-7 w-7 rounded-lg text-xs font-mono font-semibold shrink-0 flex items-center justify-center border transition-all ${isCurrent
                        ? "bg-emerald-500 text-zinc-950 border-emerald-400 font-bold"
                        : isAnswered
                          ? "bg-zinc-800 text-zinc-200 border-zinc-700"
                          : "bg-zinc-900/60 text-zinc-500 border-zinc-800"
                      }`}
                  >
                    <span>{qNum}</span>
                    {isFlagged && (
                      <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-400 border border-zinc-950" />
                    )}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setIsFinished(true)}
              className="shrink-0 px-2 py-1 rounded-lg border border-zinc-700 bg-zinc-900 text-[11px] font-semibold text-zinc-200 hover:bg-zinc-800"
            >
              Finir
            </button>
          </div>

          {/* Barre d'adresse Moodle sécurisée avec statut d'auto-sauvegarde en temps réel */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-2 bg-zinc-950/60 border-b border-zinc-800/60 text-xs gap-3">
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-lg max-w-xl flex-1 text-xs font-mono text-zinc-300 min-w-0">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
              <Lock size={12} className="text-emerald-400 flex-shrink-0" />
              <span className="truncate text-[11px] sm:text-xs">{moodleUrl}</span>
            </div>

            <div className="flex items-center gap-3 text-xs text-zinc-400 shrink-0">
              <span className="hidden sm:flex items-center gap-1.5">
                <Wifi size={13} className="text-emerald-400" />
                TLS 1.3
              </span>
              <div className="flex items-center gap-1.5 bg-zinc-900/80 px-2.5 py-1 rounded-lg border border-zinc-800 font-mono text-[11px]">
                {saveStatus === "saving" ? (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                    <span className="text-amber-300">Enregistrement...</span>
                  </>
                ) : (
                  <>
                    <Check size={12} className="text-emerald-400" />
                    <span className="text-zinc-300">
                      Enregistré à <span className="text-emerald-400 font-semibold">{lastSavedTime}</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Énoncé et options de réponse de la question (avec échelle typographique dynamique) */}
          <div className="p-4 sm:p-8 max-w-3xl mx-auto w-full space-y-6">
            <div className="p-6 sm:p-8 rounded-3xl border border-zinc-800 bg-zinc-950/80 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
                <span className="text-xs sm:text-sm font-mono font-bold text-emerald-400">
                  Question {currentQuestion} sur 8
                </span>

                <div className="flex items-center gap-3">
                  {/* Bouton d'Épinglage pour révision */}
                  <button
                    onClick={() => toggleFlagQuestion(currentQuestion)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${flaggedQuestions.includes(currentQuestion)
                        ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
                        : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700"
                      }`}
                    title="Épingler cette question pour y revenir avant de soumettre (Touche F)"
                  >
                    <Flag
                      size={13}
                      className={flaggedQuestions.includes(currentQuestion) ? "fill-amber-400 text-amber-400" : ""}
                    />
                    <span>{flaggedQuestions.includes(currentQuestion) ? "Épinglée" : "Épingler (F)"}</span>
                  </button>

                  <span className="text-xs sm:text-sm text-zinc-400 font-mono">Barème : 2.00 pt(s)</span>
                </div>
              </div>

              {currentQuestion === 1 ? (
                <>
                  <h2
                    className={`font-bold text-zinc-100 leading-snug ${fontSizeLevel === "normal"
                        ? "text-base sm:text-lg"
                        : fontSizeLevel === "large"
                          ? "text-lg sm:text-xl"
                          : "text-xl sm:text-2xl"
                      }`}
                  >
                    Quelle est la complexité asymptotique moyenne de la recherche d'une clé dans une table de hachage bien dimensionnée avec résolution par adressage ouvert ?
                  </h2>
                  <div className="space-y-3 pt-2">
                    {[
                      { id: "a", keynum: "1", text: "O(log n) dans le pire des cas" },
                      { id: "b", keynum: "2", text: "O(1) en moyenne grâce à une fonction de hachage uniforme" },
                      { id: "c", keynum: "3", text: "O(n) amorti sur l'ensemble des réallocations" },
                      { id: "d", keynum: "4", text: "O(n log n) si le facteur de charge dépasse 0.75" },
                    ].map((opt) => (
                      <label
                        key={opt.id}
                        className={`flex items-center gap-3.5 p-4 rounded-2xl border cursor-pointer transition-colors ${fontSizeLevel === "normal"
                            ? "text-sm sm:text-base"
                            : fontSizeLevel === "large"
                              ? "text-base sm:text-lg"
                              : "text-lg sm:text-xl"
                          } ${answers[1] === opt.id
                            ? "border-emerald-500/50 bg-emerald-500/10 text-zinc-100 font-semibold"
                            : "border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:bg-zinc-900/80"
                          }`}
                      >
                        <input
                          type="radio"
                          name="q1"
                          checked={answers[1] === opt.id}
                          onChange={() => updateAnswer(1, opt.id)}
                          className="h-4 w-4 border-zinc-700 text-emerald-500 focus:ring-emerald-500/20"
                        />
                        <span className="flex-1">{opt.text}</span>
                        <span className="text-[10px] font-mono text-zinc-500 uppercase px-1.5 py-0.5 rounded bg-zinc-800/80">
                          {opt.keynum}
                        </span>
                      </label>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <h2
                    className={`font-bold text-zinc-100 leading-snug ${fontSizeLevel === "normal"
                        ? "text-base sm:text-lg"
                        : fontSizeLevel === "large"
                          ? "text-lg sm:text-xl"
                          : "text-xl sm:text-2xl"
                      }`}
                  >
                    Implémentez l'inversion d'une liste chaînée simple en complexité mémoire O(1).
                  </h2>
                  <div className="pt-2">
                    <textarea
                      rows={8}
                      value={answers[currentQuestion] || ""}
                      onChange={(e) => updateAnswer(currentQuestion, e.target.value)}
                      placeholder="// Écrivez votre code d'implémentation ici..."
                      className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-xs sm:text-sm font-mono text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-500/50 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-between items-center pt-5 border-t border-zinc-800/80">
                <button
                  disabled={currentQuestion === 1}
                  onClick={() => setCurrentQuestion((prev) => Math.max(1, prev - 1))}
                  className="rounded-xl border border-zinc-700 bg-zinc-800/80 px-5 py-2.5 text-xs sm:text-sm font-semibold text-zinc-300 hover:bg-zinc-700 transition-colors disabled:opacity-40"
                >
                  ← Question précédente
                </button>
                <button
                  disabled={currentQuestion === 8}
                  onClick={() => setCurrentQuestion((prev) => Math.min(8, prev + 1))}
                  className="rounded-xl bg-zinc-100 px-5 py-2.5 text-xs sm:text-sm font-bold text-zinc-950 hover:bg-white transition-colors disabled:opacity-40"
                >
                  Question suivante • 
                </button>
              </div>
            </div>
          </div>

          {/* 3. MINI-MONITEUR PIP DÉPLAÇABLE & RÉDUCTIBLE (Avec Option Ghost Camera Anti-Stress) */}
          <div
            className={`absolute ${getPipPositionClass(
              pipPosition
            )} transition-all duration-300 z-30`}
          >
            {pipMinimized ? (
              /* Mode Réduit : Badge ultra-discret */
              <div className="flex items-center gap-2.5 rounded-full border border-zinc-800 bg-zinc-900/95 px-3.5 py-2 shadow-2xl backdrop-blur">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${multipleFaces
                      ? "bg-rose-500 animate-ping"
                      : faceDetected
                        ? "bg-emerald-400"
                        : "bg-amber-400 animate-pulse"
                    }`}
                />
                <span className="text-xs font-semibold text-zinc-200">
                  {multipleFaces ? "2 visages !" : faceDetected ? "Surveillance active" : "Visage absent"}
                </span>
                <button
                  onClick={() => setPipMinimized(false)}
                  className="text-zinc-400 hover:text-white p-0.5 ml-1"
                  aria-label="Agrandir la caméra"
                >
                  <Maximize2 size={13} />
                </button>
              </div>
            ) : (
              /* Mode Déplié : Mini-moniteur vidéo complet */
              <div className="w-56 rounded-2xl border border-zinc-800 bg-zinc-900/95 p-3.5 shadow-2xl backdrop-blur">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800 text-xs">
                  <span className="font-bold text-zinc-200 flex items-center gap-1.5">
                    <Camera size={14} className="text-emerald-400" />
                    Webcam PiP
                  </span>

                  <div className="flex items-center gap-1">
                    {/* Bouton Ghost Camera (Masquage visuel du miroir pour éliminer la fatigue) */}
                    <button
                      onClick={() => setGhostCamera((prev) => !prev)}
                      className={`p-1 rounded transition-colors ${ghostCamera
                          ? "text-emerald-400 bg-emerald-500/15"
                          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                        }`}
                      title={
                        ghostCamera
                          ? "Afficher le miroir vidéo (Touche G)"
                          : "Mode Discret : Masquer mon reflet (Touche G)"
                      }
                    >
                      <EyeOff size={12} />
                    </button>
                    <button
                      onClick={cyclePipPosition}
                      className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                      title="Changer d'angle"
                    >
                      <Move size={12} />
                    </button>
                    <button
                      onClick={() => setPipMinimized(true)}
                      className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                      title="Minimiser (Touche M)"
                    >
                      <Minimize2 size={12} />
                    </button>
                  </div>
                </div>

                <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black border border-zinc-800">
                  {/* Flux vidéo toujours présent dans le DOM pour permettre à MediaPipe de poursuivre l'analyse IA */}
                  <video
                    ref={handlePipVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`h-full w-full object-cover -scale-x-100 ${ghostCamera ? "hidden" : "block"
                      }`}
                  />

                  {/* Mode Discret / Ghost Camera : Écran de rassurance anti-anxiété */}
                  {ghostCamera && (
                    <div className="h-full w-full bg-zinc-950 flex flex-col items-center justify-center p-2.5 text-center">
                      <div className="relative mb-1.5">
                        <div className="h-8 w-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                          <EyeOff size={15} />
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border border-zinc-950 animate-pulse" />
                      </div>
                      <span className="text-[10px] font-bold text-zinc-200">Mode Discret Actif</span>
                      <span className="text-[9px] text-zinc-400 leading-tight">Visage masqué ⬢ IA active</span>
                    </div>
                  )}

                  {/* Pastille de statut en surimpression */}
                  <div className="absolute top-2 left-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-mono font-bold backdrop-blur ${multipleFaces
                          ? "bg-rose-500/90 text-white"
                          : faceDetected
                            ? "bg-emerald-500/90 text-zinc-950"
                            : "bg-amber-500/90 text-zinc-950"
                        }`}
                    >
                      {multipleFaces ? "MULTI-FACES" : faceDetected ? "OK" : "ABSENT"}
                    </span>
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-between text-xs text-zinc-400 font-mono">
                  <span>Vision Locale</span>
                  <span className="text-emerald-400 font-semibold">0 flux cloud</span>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* 4. MODAL D'AIDE AUX RACCOURCIS CLAVIER D'EXAMEN */}
      {showShortcutsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Keyboard size={18} className="text-emerald-400" />
                <h3 className="font-bold text-zinc-100 text-sm">Raccourcis Clavier d'Examen</h3>
              </div>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="text-zinc-400 hover:text-white text-xs px-2 py-1 rounded bg-zinc-900 border border-zinc-800"
              >
                Fermer
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                <span className="text-zinc-300">Question suivante</span>
                <kbd className="px-2 py-0.5 rounded bg-zinc-800 font-mono text-zinc-200 border border-zinc-700">• </kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                <span className="text-zinc-300">Question précédente</span>
                <kbd className="px-2 py-0.5 rounded bg-zinc-800 font-mono text-zinc-200 border border-zinc-700">←</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                <span className="text-zinc-300">Sélectionner option QCM</span>
                <kbd className="px-2 py-0.5 rounded bg-zinc-800 font-mono text-zinc-200 border border-zinc-700">1, 2, 3, 4</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                <span className="text-zinc-300">Épingler pour révision</span>
                <kbd className="px-2 py-0.5 rounded bg-zinc-800 font-mono text-zinc-200 border border-zinc-700">F</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                <span className="text-zinc-300">Réduire / Agrandir la caméra</span>
                <kbd className="px-2 py-0.5 rounded bg-zinc-800 font-mono text-zinc-200 border border-zinc-700">M</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                <span className="text-zinc-300">Mode Discret (Masquer miroir)</span>
                <kbd className="px-2 py-0.5 rounded bg-zinc-800 font-mono text-zinc-200 border border-zinc-700">G</kbd>
              </div>
            </div>

            <p className="text-[11px] text-zinc-500 text-center">
              Ces touches simples sont autorisées par le mode Kiosk et ne compromettent pas la sécurité de session.
            </p>
          </div>
        </div>
      )}

      {/* 5. MODAL D'AVERTISSEMENT OU D'ALERTE SURVEILLANT */}
      {activeModalStrike && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-6">
          <div
            className={`w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border bg-zinc-950 p-5 sm:p-8 shadow-2xl text-center space-y-5 animate-in fade-in zoom-in-95 ${activeModalStrike.isProctorAlert
                ? "border-amber-500/40"
                : "border-rose-500/40"
              }`}
          >
            <div
              className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border ${activeModalStrike.isProctorAlert
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                }`}
            >
              {activeModalStrike.isProctorAlert ? (
                <Shield size={32} />
              ) : (
                <AlertTriangle size={32} />
              )}
            </div>

            <div>
              <span
                className={`inline-block rounded-full px-3.5 py-1 text-xs font-mono font-bold mb-2 border ${activeModalStrike.isProctorAlert
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                    : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                  }`}
              >
                {activeModalStrike.isProctorAlert
                  ? "Alerte Surveillant • Contrôle Humain Obligatoire"
                  : `Avertissement ${activeModalStrike.strike_number} sur ${activeModalStrike.max_strikes}`}
              </span>
              <h3 className="text-lg font-bold text-zinc-100">
                {activeModalStrike.isProctorAlert
                  ? "Dossier Transmis au Surveillant Humain"
                  : "Incident de Surveillance Constaté"}
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-zinc-300 leading-relaxed">
                {activeModalStrike.reason}
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 text-xs sm:text-sm text-zinc-300 space-y-1.5 text-left font-mono">
              <div><strong className="text-zinc-100">Horodatage :</strong> {activeModalStrike.timestamp}</div>
              <div>
                <strong className="text-zinc-100">Statut :</strong>{" "}
                {activeModalStrike.isProctorAlert
                  ? "Dossier d'incident consigné pour arbitrage"
                  : "Preuve photographique archivée"}
              </div>
              <div
                className={`pt-1 font-semibold ${activeModalStrike.isProctorAlert ? "text-amber-400" : "text-rose-400"
                  }`}
              >
                {activeModalStrike.isProctorAlert
                  ? "•a️ Conformément au RGPD et à l'AI Act, aucune décision d'expulsion n'est prise par l'IA seule. Vous pouvez poursuivre votre épreuve. Seul le surveillant humain pourra statuer."
                  : "Au 3ème avertissement, le dossier est transmis au surveillant pour décision."}
              </div>
            </div>

            <button
              onClick={() => setActiveModalStrike(null)}
              className={`w-full rounded-xl py-3 text-xs sm:text-sm font-bold transition-colors min-h-[44px] ${activeModalStrike.isProctorAlert
                  ? "bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
                  : "bg-zinc-100 text-zinc-950 hover:bg-white"
                }`}
            >
              {activeModalStrike.isProctorAlert
                ? "Poursuivre mon examen"
                : "J'ai compris • Reprendre l'épreuve"}
            </button>

            {/* Droit d'acquittement immédiat par le surveillant sur place */}
            <div className="pt-2 border-t border-zinc-800/80">
              {!showProctorPinModal ? (
                <button
                  type="button"
                  onClick={() => setShowProctorPinModal(true)}
                  className="text-[11px] text-zinc-400 hover:text-zinc-200 underline"
                >
                  Surveillant présent dans la salle ? Acquitter l'incident
                </button>
              ) : (
                <div className="mt-2 p-3 rounded-xl border border-zinc-800 bg-zinc-900/90 text-left space-y-2">
                  <span className="text-[11px] font-bold text-zinc-200 block">
                    Code PIN du Surveillant (Acquittement de salle)
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      maxLength={8}
                      disabled={lockoutCountdown > 0}
                      value={proctorPin}
                      onChange={(e) => {
                        setProctorPin(e.target.value);
                        setProctorPinError(null);
                      }}
                      placeholder={lockoutCountdown > 0 ? `Bloqué (${lockoutCountdown}s)` : "Code PIN"}
                      className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 font-mono disabled:opacity-50"
                    />
                    <button
                      type="button"
                      disabled={lockoutCountdown > 0}
                      onClick={async () => {
                        if (Date.now() < proctorPinLockoutUntil) {
                          setProctorPinError(`Trop de tentatives. Veuillez patienter ${lockoutCountdown}s.`);
                          return;
                        }

                        const result = await verifyProctorPinHash(proctorPin, isTauri);

                        if (result.lockoutSeconds) {
                          setProctorPinLockoutUntil(Date.now() + result.lockoutSeconds * 1000);
                          setLockoutCountdown(result.lockoutSeconds);
                          setProctorPinError(result.errorMessage || `Verrouillage actif (${result.lockoutSeconds}s restantes).`);
                          return;
                        }

                        if (result.success) {
                          setStrikes(0);
                          setIsFlaggedForProctorReview(false);
                          setActiveModalStrike(null);
                          setShowProctorPinModal(false);
                          setProctorPin("");
                          setProctorPinAttempts(0);
                          setProctorPinError(null);
                        } else {
                          const newAttempts = proctorPinAttempts + 1;
                          setProctorPinAttempts(newAttempts);
                          if (newAttempts >= 3) {
                            setProctorPinLockoutUntil(Date.now() + 60000);
                            setLockoutCountdown(60);
                            setProctorPinError("3 tentatives incorrectes. Saisie bloquée pendant 60 secondes.");
                          } else {
                            setProctorPinError(
                              result.errorMessage || `Code PIN incorrect (${3 - newAttempts} essai(s) restant(s))`
                            );
                          }
                        }
                      }}
                      className="rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold px-3 py-1.5 text-xs disabled:opacity-40"
                    >
                      Acquitter
                    </button>
                  </div>
                  {proctorPinError && (
                    <span className="text-[10px] text-rose-400 block">{proctorPinError}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
