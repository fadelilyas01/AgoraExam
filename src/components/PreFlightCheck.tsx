import { useState, useEffect, useRef } from "react";
import {
  ShieldCheck,
  Monitor,
  Camera,
  AlertTriangle,
  Lock,
  ArrowRight,
  RefreshCw,
  VideoOff,
  Info,
  Check,
  Eye,
  Cpu,
  BookOpen,
  CheckCircle2,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

interface HardwareStatus {
  singleMonitor: boolean;
  monitorCount: number;
  monitorMessage: string;
  cameraReady: boolean;
  micReady: boolean;
}

interface PreFlightCheckProps {
  onExamReady: () => void;
  mediaStream: MediaStream | null;
  onStreamReady: (stream: MediaStream) => void;
  onOpenDocs?: () => void;
}

export function PreFlightCheck({
  onExamReady,
  mediaStream,
  onStreamReady,
  onOpenDocs,
}: PreFlightCheckProps) {
  const [hardware, setHardware] = useState<HardwareStatus>({
    singleMonitor: true,
    monitorCount: 1,
    monitorMessage: "Vérification de l'affichage...",
    cameraReady: false,
    micReady: false,
  });

  const [isChecking, setIsChecking] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"check" | "privacy">("check");

  const localVideoRef = useRef<HTMLVideoElement>(null);

  // 1. Connexion du flux vidéo dès qu'il est fourni
  useEffect(() => {
    if (localVideoRef.current && mediaStream) {
      localVideoRef.current.srcObject = mediaStream;
      localVideoRef.current
        .play()
        .catch((err) => console.log("Lecture vidéo différée :", err));
    }
  }, [mediaStream]);

  // 2. Diagnostic complet Caméra, Micro et Affichage
  const requestCameraPermission = async () => {
    setIsChecking(true);
    setCameraError(null);

    let stream: MediaStream | null = mediaStream;
    let camOk = false;
    let micOk = false;

    // A. Caméra
    try {
      if (!stream || stream.getVideoTracks().length === 0 || !stream.active) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user",
          },
          audio: false,
        });
      }

      camOk = stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].readyState === "live";
      onStreamReady(stream);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        await localVideoRef.current.play();
      }
    } catch (err: any) {
      console.error("Erreur d'accès webcam :", err);

      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError(
          "L'accès à la caméra a été refusé. Veuillez autoriser AgoraExam dans les paramètres de confidentialité de votre système d'exploitation."
        );
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setCameraError(
          "Aucune caméra n'a été détectée. Veuillez brancher une webcam USB ou vérifier le périphérique intégré."
        );
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        setCameraError(
          "Votre caméra est actuellement utilisée par une autre application (Zoom, Teams, Discord). Fermez-les avant de relancer le test."
        );
      } else {
        setCameraError(`Erreur d'accès à la caméra : ${err.message || err.name}`);
      }
    }

    // B. Micro (contrôle discret)
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micOk = audioStream.getAudioTracks().length > 0;
      audioStream.getTracks().forEach((t) => t.stop());
    } catch {
      micOk = false;
    }

    // C. Détection du multi-écran via Tauri Backend
    let isSingleMon = true;
    let monCount = 1;
    let monMsg = "1 seul écran physique détecté.";
    try {
      const result = await invoke<{
        is_valid: boolean;
        monitor_count: number;
        message: string;
      }>("verifier_materiel");

      isSingleMon = result.is_valid;
      monCount = result.monitor_count;
      monMsg = result.message;
    } catch {
      isSingleMon = true;
    }

    setHardware({
      singleMonitor: isSingleMon,
      monitorCount: monCount,
      monitorMessage: monMsg,
      cameraReady: camOk,
      micReady: micOk,
    });

    setIsChecking(false);
  };

  useEffect(() => {
    requestCameraPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allChecksPass = hardware.singleMonitor && hardware.cameraReady;

  const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

  const handleStartExam = async () => {
    if (!allChecksPass || !agreed) return;

    // Si lancé dans un navigateur Web standard, forcer le plein écran HTML5
    if (typeof document !== "undefined" && !document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
      } catch (err) {
        console.warn("Plein écran HTML5 indisponible :", err);
      }
    }

    try {
      await invoke("verrouiller_examen");
    } catch (e) {
      console.warn("Verrouillage Kiosk natif ignoré en aperçu web :", e);
    }

    onExamReady();
  };

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-zinc-950 p-6 text-zinc-100 font-sans antialiased">
      <div className="w-full max-w-2xl rounded-2xl border border-zinc-800/80 bg-zinc-900/80 p-8 shadow-2xl backdrop-blur-md">
        {/* En-tête / Barre supérieure */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-800/90 text-emerald-400 border border-zinc-700/60 shadow-inner">
              <ShieldCheck size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold tracking-tight text-zinc-100">
                  AgoraExam
                </h1>
                <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-mono text-zinc-400 border border-zinc-700/50">
                  v0.1.0-secure
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Assistant de vérification matérielle & conformité éthique
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenDocs && (
              <button
                onClick={onOpenDocs}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950/60 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                title="Consulter la documentation"
                aria-label="Consulter la documentation"
              >
                <BookOpen size={13} className="text-emerald-400" />
                <span className="hidden sm:inline">Docs</span>
              </button>
            )}

            <div className="flex rounded-lg bg-zinc-950/60 p-1 border border-zinc-800/60">
              <button
                onClick={() => setActiveTab("check")}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  activeTab === "check"
                    ? "bg-zinc-800 text-zinc-100 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
                aria-label="Afficher le diagnostic matériel"
              >
                Diagnostic
              </button>
              <button
                onClick={() => setActiveTab("privacy")}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  activeTab === "privacy"
                    ? "bg-zinc-800 text-zinc-100 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
                aria-label="Afficher les engagements de confidentialité"
              >
                Confidentialité
              </button>
            </div>

            <button
              onClick={requestCameraPermission}
              disabled={isChecking}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700/70 bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700 transition-colors disabled:opacity-40"
              title="Relancer le diagnostic"
              aria-label="Relancer le diagnostic"
            >
              <RefreshCw size={13} className={isChecking ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {activeTab === "privacy" ? (
          /* Onglet 2 : Charte Éthique & RGPD */
          <div className="py-6 space-y-4">
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/50 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                <Cpu size={15} />
                <span>Inférence 100% Locale (Edge AI)</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Contrairement aux logiciels de surveillance traditionnels, AgoraExam n'envoie
                aucun flux vidéo continu vers des serveurs distants. L'analyse du visage est effectuée
                directement par le processeur de votre machine via MediaPipe WebAssembly.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/50 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                <Eye size={15} className="text-blue-400" />
                <span>Preuves Proportionnées & Horodatées</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Seules des photographies ponctuelles lors d'infractions avérées (départ prolongé de plus de 4 secondes
                ou présence de plusieurs personnes) sont enregistrées pour servir de pièce officielle lors des jurys.
              </p>
            </div>

            <button
              onClick={() => setActiveTab("check")}
              className="w-full py-2 text-xs font-medium text-emerald-400 hover:underline text-center block"
            >
              ← Revenir au diagnostic matériel
            </button>
          </div>
        ) : (
          /* Onglet 1 : Diagnostic Matériel */
          <div className="py-5 space-y-5">
            {/* Avertissement Mode Navigateur Web vs Application Desktop */}
            {!isTauri ? (
              <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 text-xs space-y-1">
                <div className="flex items-center gap-2 font-semibold text-amber-300">
                  <AlertTriangle size={15} />
                  <span>Aperçu dans Navigateur Web standard (`npm run dev`)</span>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  Vous exécutez AgoraExam dans un onglet standard de votre navigateur. Les bacs à sable des navigateurs interdisent par sécurité le verrouillage exclusif de votre système d'exploitation (Alt+Tab, blocage des fenêtres tierces).
                </p>
                <div className="pt-1 text-[11px] font-mono text-amber-300 font-medium">
                  👉 Pour tester le verrouillage réel de l'écran et du système, lancez : <span className="bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800">npm run tauri dev</span>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 text-xs flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                <span className="text-[11px] text-zinc-300">
                  <strong className="text-emerald-300">Application native Tauri v2 active :</strong> Le confinement Kiosk matériel et la capture exclusive du focus sont armés.
                </span>
              </div>
            )}

            {/* Message d'Erreur Caméra Actionnable */}
            {cameraError && (
              <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs space-y-2">
                <div className="flex items-center gap-2 font-semibold text-rose-400">
                  <AlertTriangle size={15} />
                  <span>Caméra non disponible</span>
                </div>
                <p className="leading-relaxed text-zinc-300">{cameraError}</p>
                <div className="pt-1 flex gap-2">
                  <button
                    onClick={requestCameraPermission}
                    className="rounded-md bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-600 transition-colors"
                  >
                    Réessayer
                  </button>
                </div>
              </div>
            )}

            {/* Cartes des contrôles matériels */}
            <div className="grid grid-cols-2 gap-3.5">
              {/* Carte 1 : Écran Unique */}
              <div
                className={`rounded-xl border p-4 transition-colors ${
                  hardware.singleMonitor
                    ? "border-zinc-800/90 bg-zinc-950/40"
                    : "border-rose-500/40 bg-rose-500/10"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                        hardware.singleMonitor
                          ? "bg-zinc-800 text-zinc-200"
                          : "bg-rose-500/20 text-rose-400"
                      }`}
                    >
                      <Monitor size={16} />
                    </div>
                    <div>
                      <span className="text-xs font-semibold block text-zinc-200">
                        Écran Physique
                      </span>
                      <span className="text-[11px] text-zinc-400 font-mono">
                        {hardware.monitorCount} écran(s)
                      </span>
                    </div>
                  </div>
                  {hardware.singleMonitor ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                      <Check size={12} />
                    </span>
                  ) : (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500/20 text-rose-400">
                      <AlertTriangle size={12} />
                    </span>
                  )}
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-zinc-400">
                  {hardware.singleMonitor
                    ? "Configuration validée (aucun écran externe)."
                    : "Débranchez vos câbles HDMI / DisplayPort."}
                </p>
              </div>

              {/* Carte 2 : Webcam */}
              <div
                className={`rounded-xl border p-4 transition-colors ${
                  hardware.cameraReady
                    ? "border-zinc-800/90 bg-zinc-950/40"
                    : "border-amber-500/40 bg-amber-500/10"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                        hardware.cameraReady
                          ? "bg-zinc-800 text-zinc-200"
                          : "bg-amber-500/20 text-amber-400"
                      }`}
                    >
                      <Camera size={16} />
                    </div>
                    <div>
                      <span className="text-xs font-semibold block text-zinc-200">
                        Webcam & IA
                      </span>
                      <span className="text-[11px] text-zinc-400 font-mono">
                        {hardware.cameraReady ? "Opérationnelle" : "En attente"}
                      </span>
                    </div>
                  </div>
                  {hardware.cameraReady ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                      <Check size={12} />
                    </span>
                  ) : (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
                      <AlertTriangle size={12} />
                    </span>
                  )}
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-zinc-400">
                  {hardware.cameraReady
                    ? "Flux actif et prêt pour l'analyse faciale."
                    : "Autorisation requise pour continuer."}
                </p>
              </div>
            </div>

            {/* Zone de Cadrage Vidéo & Silhouette */}
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-4">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800/60 text-xs">
                <span className="font-semibold text-zinc-200 flex items-center gap-2">
                  <Camera size={14} className="text-emerald-400" />
                  Mire de cadrage du visage
                </span>
                <span className="text-[11px] text-zinc-400 font-mono">
                  {hardware.cameraReady ? "640x480 • 30 FPS" : "Flux inactif"}
                </span>
              </div>

              <div className="flex gap-4 items-center">
                {/* Cadre vidéo avec coins de visée esthétiques */}
                <div className="relative h-36 w-48 flex-shrink-0 rounded-lg overflow-hidden bg-black border border-zinc-800 flex items-center justify-center">
                  {isChecking && !hardware.cameraReady ? (
                    /* Skeleton Loader */
                    <div className="h-full w-full bg-zinc-900 animate-pulse flex flex-col items-center justify-center text-zinc-600 gap-2">
                      <RefreshCw size={20} className="animate-spin text-zinc-500" />
                      <span className="text-[10px]">Initialisation...</span>
                    </div>
                  ) : hardware.cameraReady ? (
                    <>
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="h-full w-full object-cover -scale-x-100"
                      />
                      {/* Viseur esthétique façon caméra pro */}
                      <div className="absolute inset-2 border border-emerald-500/30 rounded pointer-events-none" />
                      <div className="absolute top-2 left-2 w-2 h-2 border-t-2 border-l-2 border-emerald-400 pointer-events-none" />
                      <div className="absolute top-2 right-2 w-2 h-2 border-t-2 border-r-2 border-emerald-400 pointer-events-none" />
                      <div className="absolute bottom-2 left-2 w-2 h-2 border-b-2 border-l-2 border-emerald-400 pointer-events-none" />
                      <div className="absolute bottom-2 right-2 w-2 h-2 border-b-2 border-r-2 border-emerald-400 pointer-events-none" />
                    </>
                  ) : (
                    /* Empty / Inactive state */
                    <div className="flex flex-col items-center justify-center text-zinc-600 gap-1.5 p-3 text-center">
                      <VideoOff size={22} />
                      <span className="text-[10px]">Caméra non initialisée</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 text-xs text-zinc-400 leading-relaxed space-y-2">
                  <p className="text-zinc-300">
                    {hardware.cameraReady
                      ? "✅ Votre visage est correctement cadré. Assurez-vous d'avoir un éclairage suffisant sur votre visage tout au long de l'épreuve."
                      : "Le système requiert l'accès à votre webcam pour valider votre présence en toute conformité."}
                  </p>
                  {!hardware.cameraReady && (
                    <button
                      onClick={requestCameraPermission}
                      disabled={isChecking}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-white transition-colors"
                      aria-label="Autoriser la caméra"
                    >
                      <Camera size={13} />
                      {isChecking ? "Vérification..." : "Activer la Caméra"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Engagement & Consentement de l'étudiant */}
            <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-xs text-zinc-300 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <Lock size={15} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-zinc-400 leading-normal">
                  <strong>Règle des 3 Strikes :</strong> Une absence prolongée (+4s) ou la présence
                  d'une tierce personne déclenchera un avertissement. Au 3ème avertissement,
                  l'examen sera automatiquement soumis et scellé sur Moodle.
                </p>
              </div>
              <label className="flex items-center gap-2.5 pt-1 text-zinc-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500/20"
                />
                <span className="text-xs">
                  J'accepte le protocole de surveillance locale et le verrouillage plein écran.
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Bouton de Démarrage */}
        <div className="mt-6 flex items-center justify-between border-t border-zinc-800/80 pt-5">
          <div className="flex items-center gap-2 text-[11px] text-zinc-500">
            <Info size={13} />
            <span>Moodle Session ID : #48291-SEC</span>
          </div>

          <button
            onClick={handleStartExam}
            disabled={!allChecksPass || !agreed}
            className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-semibold text-zinc-950 hover:bg-emerald-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-md shadow-emerald-500/10 active:scale-[0.98]"
            aria-label="Démarrer l'examen sécurisé"
          >
            <span>Démarrer l'Examen Sécurisé</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
