import { FilesetResolver, FaceLandmarker } from "@mediapipe/tasks-vision";

export interface FaceDetectionResult {
  hasFace: boolean;
  faceCount: number;
  confidence: number;
}

export class ProctorVisionService {
  private landmarker: FaceLandmarker | null = null;
  private isInitializing: boolean = false;

  async initialize(): Promise<void> {
    if (this.landmarker || this.isInitializing) return;
    this.isInitializing = true;

    try {
      const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );

      // 1. Tentative avec accélération matérielle (GPU)
      try {
        this.landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numFaces: 2,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
        });
        console.info("[ProctorVision] MediaPipe initialisé avec succès sur GPU.");
      } catch (gpuError) {
        console.warn("[ProctorVision] GPU non supporté, bascule automatique sur CPU :", gpuError);
        // 2. Fallback universel CPU pour vieux processeurs et machines sans WebGL2
        this.landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "CPU",
          },
          runningMode: "VIDEO",
          numFaces: 2,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
        });
        console.info("[ProctorVision] MediaPipe initialisé avec succès sur CPU (Mode Compatibilité).");
      }
    } catch (error) {
      console.error("[ProctorVision] Échec d'initialisation MediaPipe :", error);
      // Ne pas bloquer l'étudiant en cas de coupure : mode dégradé tolérant
    } finally {
      this.isInitializing = false;
    }
  }

  private lastTimestamp: number = -1;

  detectFace(videoElement: HTMLVideoElement, timestampMs: number): FaceDetectionResult {
    if (!this.landmarker || !videoElement || videoElement.readyState < 2 || videoElement.videoWidth === 0) {
      return { hasFace: true, faceCount: 1, confidence: 1.0 };
    }

    try {
      // MediaPipe exige un timestamp strictement croissant et positif
      const safeTimestamp = Math.max(Math.floor(timestampMs), this.lastTimestamp + 1);
      this.lastTimestamp = safeTimestamp;

      const results = this.landmarker.detectForVideo(videoElement, safeTimestamp);
      const faceCount = results.faceLandmarks ? results.faceLandmarks.length : 0;

      return {
        hasFace: faceCount === 1,
        faceCount,
        confidence: faceCount > 0 ? 0.95 : 0.0,
      };
    } catch (err) {
      console.warn("[ProctorVision] Inférence tolérante (fallback) :", err);
      return { hasFace: true, faceCount: 1, confidence: 1.0 };
    }
  }
}

export const proctorVision = new ProctorVisionService();
