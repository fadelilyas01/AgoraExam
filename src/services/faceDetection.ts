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

      this.landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numFaces: 2, // Permet de détecter si une 2ème personne entre dans le champ !
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
      });

      console.info("[ProctorVision] MediaPipe Face Landmarker initialisé avec succès.");
    } catch (error) {
      console.error("[ProctorVision] Erreur d'initialisation MediaPipe :", error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  detectFace(videoElement: HTMLVideoElement, timestampMs: number): FaceDetectionResult {
    if (!this.landmarker) {
      return { hasFace: true, faceCount: 1, confidence: 1.0 };
    }

    const results = this.landmarker.detectForVideo(videoElement, timestampMs);
    const faceCount = results.faceLandmarks ? results.faceLandmarks.length : 0;

    return {
      hasFace: faceCount === 1,
      faceCount,
      confidence: faceCount > 0 ? 0.95 : 0.0,
    };
  }
}

export const proctorVision = new ProctorVisionService();
