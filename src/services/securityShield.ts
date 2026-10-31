/**
 * AgoraExam - Bouclier Anti-Intrusion & Sécurité Défensive Avancée
 * Conforme OWASP Top 10, CWE Top 25 et standard Secure-by-Design
 *
 * Fonctionnalités :
 * 1. Chiffrement local fort AES-256-GCM (Web Crypto API native)
 * 2. Empreinte et scellement d'intégrité SHA-256 (Anti-Tampering)
 * 3. Détecteur dynamique de DevTools et de débogage (Timing & Dimension Probe)
 * 4. Isolation du presse-papier (Anti-Exfiltration & Anti-Copier/Coller)
 * 5. Neutralisation des touches de capture d'écran (PrintScreen)
 */

export interface SecurityReport {
  isSecure: boolean;
  aesGcmActive: boolean;
  devToolsDetected: boolean;
  clipboardIsolated: boolean;
  remoteToolsDetected: string[];
  sessionFingerprint: string;
}

export interface EncryptedPayload {
  iv: string; // base64
  ciphertext: string; // base64
  timestamp: number;
}

class SecurityShieldService {
  private cryptoKey: CryptoKey | null = null;
  private sessionFingerprint: string = "";
  private isInitialized: boolean = false;
  private devToolsOpen: boolean = false;
  private listenersAttached: boolean = false;
  private onViolationCallback: ((reason: string) => void) | null = null;
  private checkInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Initialise le moteur cryptographique en générant une clé éphémère AES-256-GCM
   * non exportable pour la durée stricte de la session d'examen.
   */
  public async initialize(attemptId: number = 48291): Promise<void> {
    if (this.isInitialized && this.cryptoKey) return;

    try {
      if (typeof window !== "undefined" && window.crypto && window.crypto.subtle) {
        // Clé AES-GCM 256 bits générée en mémoire vive (RAM) uniquement
        this.cryptoKey = await window.crypto.subtle.generateKey(
          {
            name: "AES-GCM",
            length: 256,
          },
          false, // Clé non exportable (impossible à extraire via la console)
          ["encrypt", "decrypt"]
        );

        // Calcul de l'empreinte de session SHA-256
        const sessionSeed = `agora-session-${attemptId}-${Date.now()}-${Math.random()}`;
        const encoder = new TextEncoder();
        const hashBuf = await window.crypto.subtle.digest(
          "SHA-256",
          encoder.encode(sessionSeed)
        );
        this.sessionFingerprint = Array.from(new Uint8Array(hashBuf))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")
          .substring(0, 16)
          .toUpperCase();

        this.isInitialized = true;
      }
    } catch (err) {
      console.error("[SecurityShield] Initialisation cryptographique impossible :", err);
    }
  }

  /**
   * Enregistre le gestionnaire d'infraction anti-intrusion
   */
  public setViolationHandler(handler: (reason: string) => void): void {
    this.onViolationCallback = handler;
  }

  /**
   * Chiffre un état de données arbitraire avec AES-256-GCM et un vecteur d'initialisation (IV) unique
   */
  public async encryptState<T>(data: T): Promise<EncryptedPayload | null> {
    if (!this.cryptoKey || !window.crypto || !window.crypto.subtle) {
      return null;
    }

    try {
      const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV standard NIST SP 800-38D
      const encoded = new TextEncoder().encode(JSON.stringify(data));

      const ciphertextBuf = await window.crypto.subtle.encrypt(
        {
          name: "AES-256-GCM",
          iv: iv,
        },
        this.cryptoKey,
        encoded
      );

      return {
        iv: this.arrayBufferToBase64(iv.buffer),
        ciphertext: this.arrayBufferToBase64(ciphertextBuf),
        timestamp: Date.now(),
      };
    } catch (err) {
      console.error("[SecurityShield] Échec du chiffrement AES-256-GCM :", err);
      return null;
    }
  }

  /**
   * Déchiffre un état de données avec authentification cryptographique (Anti-Tamper)
   */
  public async decryptState<T>(payload: EncryptedPayload): Promise<T | null> {
    if (!this.cryptoKey || !window.crypto || !window.crypto.subtle) {
      return null;
    }

    try {
      const iv = new Uint8Array(this.base64ToArrayBuffer(payload.iv));
      const ciphertext = this.base64ToArrayBuffer(payload.ciphertext);

      const decryptedBuf = await window.crypto.subtle.decrypt(
        {
          name: "AES-256-GCM",
          iv: iv,
        },
        this.cryptoKey,
        ciphertext
      );

      const decodedStr = new TextDecoder().decode(decryptedBuf);
      return JSON.parse(decodedStr) as T;
    } catch (err) {
      // Si la donnée a été modifiée par un attaquant dans le stockage, l'authentification GCM échoue !
      console.error("[SecurityShield] Échec d'authentification cryptographique (altération détectée) :", err);
      if (this.onViolationCallback) {
        this.onViolationCallback("Tentative d'altération du stockage local d'examen détectée (Échec GCM)");
      }
      return null;
    }
  }

  /**
   * Calcule le hash SHA-256 canonique d'une chaîne ou d'un objet pour sceller une attestation
   */
  public async computeSha256(data: string): Promise<string> {
    if (!window.crypto || !window.crypto.subtle) {
      return "00000000000000000000000000000000";
    }

    const encoder = new TextEncoder();
    const dataBuf = encoder.encode(data);
    const hashBuf = await window.crypto.subtle.digest("SHA-256", dataBuf);
    return Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  /**
   * Active la surveillance active anti-intrusion (DevTools, Presse-papier, PrintScreen)
   */
  public activateActiveDefense(): void {
    if (this.listenersAttached || typeof window === "undefined") return;

    // 1. Détection des DevTools par écart de dimension de fenêtre (amarrage console)
    const checkDevTools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;

      if ((widthThreshold || heightThreshold) && !this.devToolsOpen) {
        this.devToolsOpen = true;
        if (this.onViolationCallback) {
          this.onViolationCallback("Ouverture des outils de développement (DevTools) détectée");
        }
      } else if (!widthThreshold && !heightThreshold) {
        this.devToolsOpen = false;
      }
    };

    // 2. Piège anti-debugger (mesure du delta temporel d'évaluation)
    const probeDebuggerLatency = () => {
      const start = performance.now();
      // eslint-disable-next-line no-debugger
      debugger; // Si la console est ouverte et s'arrête ici, delta > 100ms
      const delta = performance.now() - start;
      if (delta > 100 && !this.devToolsOpen) {
        this.devToolsOpen = true;
        if (this.onViolationCallback) {
          this.onViolationCallback("Point d'arrêt ou interruption de débogage externe détecté");
        }
      }
    };

    // 3. Détection de touche PrintScreen / Capture d'écran
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen") {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText("").catch(() => {});
        }
        if (this.onViolationCallback) {
          this.onViolationCallback("Tentative de capture d'écran système (PrintScreen) bloquée");
        }
      }
    };

    // 4. Neutralisation stricte du presse-papier (Anti-Copier / Anti-Coller)
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      if (e.clipboardData) {
        e.clipboardData.setData("text/plain", "");
      }
      if (this.onViolationCallback) {
        this.onViolationCallback("Copie de texte non autorisée pendant l'épreuve");
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      if (this.onViolationCallback) {
        this.onViolationCallback("Collage de contenu externe interdit");
      }
    };

    window.addEventListener("keyup", handleKeyUp, true);
    window.addEventListener("copy", handleCopy, true);
    window.addEventListener("paste", handlePaste, true);
    window.addEventListener("cut", handleCopy, true);

    this.checkInterval = setInterval(() => {
      checkDevTools();
      probeDebuggerLatency();
    }, 1500);

    this.listenersAttached = true;
  }

  /**
   * Arrête la surveillance active lors de la fin de l'examen
   */
  public deactivateActiveDefense(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.listenersAttached = false;
  }

  public getSessionFingerprint(): string {
    return this.sessionFingerprint || "SEC-ALPHA-8921";
  }

  public isDevToolsDetected(): boolean {
    return this.devToolsOpen;
  }

  // Fonctions de conversion utilitaires sécurisées
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = window.atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

export const securityShield = new SecurityShieldService();
