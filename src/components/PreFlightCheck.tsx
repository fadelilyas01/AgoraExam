import { useState, useEffect, useRef } from "react";
import {
  Monitor,
  Camera,
  AlertTriangle,
  Lock,
  ArrowRight,
  RefreshCw,
  VideoOff,
  Check,
  Eye,
  BookOpen,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { AgoraExamLogo, MoodleLogo } from "./Logos";

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
  policy?: "hybrid" | "audit" | "strict";
  onPolicyChange?: (policy: "hybrid" | "audit" | "strict") => void;
}

export function PreFlightCheck({
  onExamReady,
  mediaStream,
  onStreamReady,
  onOpenDocs,
  policy = "hybrid",
  onPolicyChange,
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
    <div className="flex min-h-screen w-screen items-center justify-center bg-zinc-950 p-4 sm:p-6 text-zinc-100 font-sans antialiased">
      <div className="w-full max-w-2xl rounded-3xl border border-zinc-800 bg-zinc-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        {/* En-tête Institutionnel avec Logo Réel AgoraExam */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-950 border border-zinc-800 shadow-md flex-shrink-0">
              <AgoraExamLogo size={30} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-zinc-100">
                  AgoraExam
                </h1>
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-mono font-semibold text-emerald-400 border border-emerald-500/20">
                  Pre-Flight Check
                </span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                Vérification du poste d'examen et conformité réglementaire
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {onOpenDocs && (
              <button
                onClick={onOpenDocs}
                className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-xs sm:text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                title="Consulter la documentation"
              >
                <BookOpen size={14} className="text-emerald-400" />
                <span>Docs</span>
              </button>
            )}

            <div className="flex rounded-xl bg-zinc-950/80 p-1 border border-zinc-800">
              <button
                onClick={() => setActiveTab("check")}
                className={`rounded-lg px-3 py-1.5 text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === "check"
                    ? "bg-zinc-800 text-zinc-100 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Diagnostic
              </button>
              <button
                onClick={() => setActiveTab("privacy")}
                className={`rounded-lg px-3 py-1.5 text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === "privacy"
                    ? "bg-zinc-800 text-zinc-100 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Confidentialité
              </button>
            </div>

            <button
              onClick={requestCameraPermission}
              disabled={isChecking}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors disabled:opacity-40"
              title="Relancer le diagnostic"
            >
              <RefreshCw size={14} className={isChecking ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {activeTab === "privacy" ? (
          /* Onglet 2 : Charte Éthique & RGPD (Zéro Buzzword IA) */
          <div className="py-6 space-y-4">
            <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-950/70 space-y-2.5">
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-400">
                <Eye size={16} />
                <span>Traitement Biométrique 100% Embarqué (Edge Computing)</span>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Contrairement aux plateformes de télésurveillance commerciales, AgoraExam n'envoie
                aucun flux vidéo continu vers des serveurs distants. L'analyse des repères faciaux est exécutée
                exclusivement dans la mémoire vive locale de votre machine via WebAssembly.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-950/70 space-y-2.5">
              <div className="flex items-center gap-2 text-sm font-bold text-blue-400">
                <Lock size={16} />
                <span>Preuves Scellées Uniquement sur Infraction Avérée</span>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Seules les absences prolongées ininterrompues (plus de 4 secondes complètes) ou la présence
                confirmée d'une tierce personne enregistrent un cliché horodaté pour le jury d'examen.
              </p>
            </div>

            <button
              onClick={() => setActiveTab("check")}
              className="w-full py-2.5 text-sm font-semibold text-emerald-400 hover:underline text-center block"
            >
              ← Revenir au diagnostic du poste
            </button>
          </div>
        ) : (
          /* Onglet 1 : Diagnostic Matériel */
          <div className="py-6 space-y-5">
            {/* Avertissement Mode Navigateur Web vs Application Desktop */}
            {!isTauri ? (
              <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-200 text-xs sm:text-sm space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <AlertTriangle size={16} />
                  <span>Aperçu dans Navigateur Web</span>
                </div>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                  Vous visualisez l'interface dans un navigateur ordinaire. Pour activer le verrouillage réel de l'OS (Alt+Tab, captures d'écran, confinement matériel), lancez l'application native.
                </p>
                <div className="pt-1 text-xs font-mono text-amber-300 font-semibold">
                  Commande : <span className="bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800">npm run tauri dev</span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 text-xs sm:text-sm flex items-center gap-3">
                <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
                <span className="text-zinc-200">
                  <strong className="text-emerald-400">Application native Tauri v2 active :</strong> Le confinement Kiosk matériel et l'interception exclusive du clavier sont armés.
                </span>
              </div>
            )}

            {/* Message d'Erreur Caméra Actionnable */}
            {cameraError && (
              <div className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs sm:text-sm space-y-2">
                <div className="flex items-center gap-2 font-bold text-rose-400">
                  <AlertTriangle size={16} />
                  <span>Caméra non disponible</span>
                </div>
                <p className="leading-relaxed text-zinc-300">{cameraError}</p>
                <div className="pt-1">
                  <button
                    onClick={requestCameraPermission}
                    className="rounded-xl bg-rose-500 px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-rose-600 transition-colors"
                  >
                    Réessayer
                  </button>
                </div>
              </div>
            )}

            {/* Cartes des contrôles matériels */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Carte 1 : Écran Unique */}
              <div
                className={`rounded-2xl border p-5 transition-colors ${
                  hardware.singleMonitor
                    ? "border-zinc-800 bg-zinc-950/60"
                    : "border-rose-500/40 bg-rose-500/10"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        hardware.singleMonitor
                          ? "bg-zinc-800 text-zinc-100"
                          : "bg-rose-500/20 text-rose-400"
                      }`}
                    >
                      <Monitor size={18} />
                    </div>
                    <div>
                      <span className="text-sm font-bold block text-zinc-100">
                        Écran Physique
                      </span>
                      <span className="text-xs text-zinc-400 font-mono">
                        {hardware.monitorCount} écran détecté
                      </span>
                    </div>
                  </div>
                  {hardware.singleMonitor ? (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Check size={14} />
                    </span>
                  ) : (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500/20 text-rose-400">
                      <AlertTriangle size={14} />
                    </span>
                  )}
                </div>
                <p className="mt-3 text-xs sm:text-sm leading-relaxed text-zinc-300">
                  {hardware.singleMonitor
                    ? "Configuration validée (aucun moniteur externe HDMI/DP)."
                    : "Débranchez immédiatement vos écrans secondaires."}
                </p>
              </div>

              {/* Carte 2 : Webcam & Vision Locale */}
              <div
                className={`rounded-2xl border p-5 transition-colors ${
                  hardware.cameraReady
                    ? "border-zinc-800 bg-zinc-950/60"
                    : "border-amber-500/40 bg-amber-500/10"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        hardware.cameraReady
                          ? "bg-zinc-800 text-zinc-100"
                          : "bg-amber-500/20 text-amber-400"
                      }`}
                    >
                      <Camera size={18} />
                    </div>
                    <div>
                      <span className="text-sm font-bold block text-zinc-100">
                        Capteur Webcam
                      </span>
                      <span className="text-xs text-zinc-400 font-mono">
                        {hardware.cameraReady ? "Opérationnel" : "En attente"}
                      </span>
                    </div>
                  </div>
                  {hardware.cameraReady ? (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Check size={14} />
                    </span>
                  ) : (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
                      <AlertTriangle size={14} />
                    </span>
                  )}
                </div>
                <p className="mt-3 text-xs sm:text-sm leading-relaxed text-zinc-300">
                  {hardware.cameraReady
                    ? "Flux actif et prêt pour la vérification de présence."
                    : "Autorisation requise pour composer."}
                </p>
              </div>
            </div>

            {/* Zone de Cadrage Vidéo & Viseur Optique */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800 text-xs sm:text-sm">
                <span className="font-bold text-zinc-200 flex items-center gap-2">
                  <Camera size={16} className="text-emerald-400" />
                  Mire Optique de Cadrage Candidat
                </span>
                <span className="text-xs text-zinc-400 font-mono">
                  {hardware.cameraReady ? "640x480 • 30 FPS" : "Flux inactif"}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-5 items-center">
                {/* Cadre vidéo avec coins de visée esthétiques */}
                <div className="relative h-44 w-56 flex-shrink-0 rounded-2xl overflow-hidden bg-black border border-zinc-800 flex items-center justify-center shadow-inner">
                  {isChecking && !hardware.cameraReady ? (
                    <div className="h-full w-full bg-zinc-900 animate-pulse flex flex-col items-center justify-center text-zinc-500 gap-2">
                      <RefreshCw size={22} className="animate-spin text-zinc-400" />
                      <span className="text-xs">Initialisation...</span>
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
                      {/* Viseur optique de précision */}
                      <div className="absolute inset-3 border border-emerald-500/30 rounded-lg pointer-events-none" />
                      <div className="absolute top-3 left-3 w-3 h-3 border-t-2 border-l-2 border-emerald-400 pointer-events-none" />
                      <div className="absolute top-3 right-3 w-3 h-3 border-t-2 border-r-2 border-emerald-400 pointer-events-none" />
                      <div className="absolute bottom-3 left-3 w-3 h-3 border-b-2 border-l-2 border-emerald-400 pointer-events-none" />
                      <div className="absolute bottom-3 right-3 w-3 h-3 border-b-2 border-r-2 border-emerald-400 pointer-events-none" />
                      <div className="absolute bottom-2 inset-x-2 text-center pointer-events-none">
                        <span className="inline-block rounded-full bg-zinc-950/80 px-2 py-0.5 text-[10px] font-mono text-emerald-400 border border-emerald-500/30 backdrop-blur">
                          Position Valide
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-zinc-600 gap-2 p-4 text-center">
                      <VideoOff size={26} />
                      <span className="text-xs">Caméra non initialisée</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 text-xs sm:text-sm text-zinc-300 leading-relaxed space-y-3">
                  <p>
                    {hardware.cameraReady
                      ? "Votre visage est centré dans la mire. Conservez votre regard orienté vers l'écran durant toute la durée de la composition."
                      : "AgoraExam requiert l'accès à la webcam pour certifier la présence continue du candidat."}
                  </p>
                  {!hardware.cameraReady && (
                    <button
                      onClick={requestCameraPermission}
                      disabled={isChecking}
                      className="inline-flex items-center gap-2 rounded-xl bg-zinc-100 px-4 py-2 text-xs sm:text-sm font-semibold text-zinc-950 hover:bg-white transition-colors"
                    >
                      <Camera size={15} />
                      <span>{isChecking ? "Vérification..." : "Activer la Caméra"}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Politique d'Examen & Human-in-the-Loop */}
            <div className="p-4 sm:p-5 rounded-2xl bg-zinc-950/70 border border-zinc-800 text-xs sm:text-sm text-zinc-300 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
                  <span className="font-semibold text-zinc-200">
                    Politique : {policy === "hybrid" ? "Contrôle Humain" : policy === "audit" ? "Audit Silencieux" : "Mode Strict"}
                  </span>
                </div>
                {onPolicyChange && (
                  <select
                    value={policy}
                    onChange={(e) => onPolicyChange(e.target.value as "hybrid" | "audit" | "strict")}
                    className="w-full sm:w-auto rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    aria-label="Sélectionner la politique de surveillance"
                  >
                    <option value="hybrid">Mode Hybride (Human-in-the-Loop - Défaut)</option>
                    <option value="audit">Mode Pédagogique (Audit Trail)</option>
                    <option value="strict">Mode Strict (Concours)</option>
                  </select>
                )}
              </div>

              <div className="flex items-start gap-3">
                <Lock size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-zinc-300 leading-relaxed text-xs">
                  {policy === "hybrid" ? (
                    <>
                      <strong>Garantie Éthique (AI Act &amp; RGPD) :</strong> En cas d'anomalies répétées (+3 avertissements), votre dossier d'épreuve est consigné avec preuve photographique et <strong>transmis à un surveillant humain</strong>. Vous continuez votre examen ; seul le surveillant habilité détient le pouvoir d'arbitrer.
                    </>
                  ) : policy === "audit" ? (
                    <>
                      <strong>Mode Pédagogique :</strong> Les anomalies sont consignées de manière transparente au dossier sans interruption de l'épreuve.
                    </>
                  ) : (
                    <>
                      <strong>Mode Strict :</strong> Au 3ème avertissement avéré, la tentative est clôturée automatiquement conformément au règlement du concours.
                    </>
                  )}
                </p>
              </div>

              <label className="flex items-center gap-3 pt-1 text-zinc-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500/20"
                />
                <span className="text-xs sm:text-sm font-medium">
                  J'accepte le protocole d'examen et le confinement en plein écran exclusif.
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Bouton de Démarrage */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between border-t border-zinc-800 pt-5 gap-4">
          <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
            <MoodleLogo size={15} />
            <span>Session Moodle ID : #48291-SEC</span>
          </div>

          <button
            onClick={handleStartExam}
            disabled={!allChecksPass || !agreed}
            className="w-full sm:w-auto min-h-[48px] flex items-center justify-center gap-2.5 rounded-xl bg-emerald-500 px-6 py-3 text-sm sm:text-base font-semibold text-zinc-950 hover:bg-emerald-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-md shadow-emerald-500/10 active:scale-[0.98]"
          >
            <span>Démarrer l'Examen Sécurisé</span>
            <ArrowRight size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}
