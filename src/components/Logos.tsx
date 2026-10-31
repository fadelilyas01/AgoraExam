interface LogoProps {
  size?: number;
  className?: string;
}

/**
 * Logo Officiel de Marque AgoraExam
 * Monogramme géométrique alliant le bouclier de sécurité institutionnelle,
 * les colonnes de l'agora académique et le verrou cryptographique souverain.
 */
export function AgoraExamLogo({ size = 28, className = "" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Logo AgoraExam"
    >
      <defs>
        <linearGradient id="agoraShieldGrad" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="agoraInnerGrad" x1="24" y1="10" x2="24" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#a7f3d0" />
        </linearGradient>
        <filter id="agoraGlow" x="0" y="0" width="48" height="48" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#10b981" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Bouclier d'encadrement géométrique souverain */}
      <path
        d="M24 4L7 11V23.5C7 34.2 14.3 43.1 24 45.8C33.7 43.1 41 34.2 41 23.5V11L24 4Z"
        fill="#09090b"
        stroke="url(#agoraShieldGrad)"
        strokeWidth="2.5"
        strokeLinejoin="round"
        filter="url(#agoraGlow)"
      />

      {/* Cadre biseauté interne */}
      <path
        d="M24 8L11 13.8V23.2C11 31.8 16.7 39.2 24 41.5C31.3 39.2 37 31.8 37 23.2V13.8L24 8Z"
        fill="#18181b"
        opacity="0.85"
      />

      {/* Fronton de l'Agora & Colonnes académiques stylisées */}
      {/* Fronton triangulaire */}
      <path
        d="M24 13L17 17.5H31L24 13Z"
        fill="url(#agoraInnerGrad)"
      />

      {/* Les 3 colonnes de l'agora (Défense en profondeur) */}
      <rect x="18" y="19.5" width="2.5" height="11" rx="1.2" fill="#34d399" />
      <rect x="22.75" y="19.5" width="2.5" height="11" rx="1.2" fill="#ffffff" />
      <rect x="27.5" y="19.5" width="2.5" height="11" rx="1.2" fill="#34d399" />

      {/* Base du temple / livre ouvert scellé */}
      <path
        d="M16 32H32V33.8C32 34.5 31.4 35 30.7 35H17.3C16.6 35 16 34.5 16 33.8V32Z"
        fill="url(#agoraInnerGrad)"
      />

      {/* Point focal de vérification cryptographique */}
      <circle cx="24" cy="24.5" r="1.5" fill="#10b981" />
    </svg>
  );
}

/**
 * Logo Officiel Microsoft Windows (4 Tuiles Modernes)
 */
export function WindowsLogo({ size = 20, className = "" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Logo Windows"
    >
      <rect x="1.5" y="1.5" width="9.8" height="9.8" rx="1" fill="#0078D4" />
      <rect x="12.7" y="1.5" width="9.8" height="9.8" rx="1" fill="#0078D4" />
      <rect x="1.5" y="12.7" width="9.8" height="9.8" rx="1" fill="#0078D4" />
      <rect x="12.7" y="12.7" width="9.8" height="9.8" rx="1" fill="#0078D4" />
    </svg>
  );
}

/**
 * Logo Officiel Apple (macOS)
 */
export function AppleLogo({ size = 20, className = "" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Logo Apple"
    >
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.85c.67-.82 1.13-1.96.99-3.1-.98.04-2.17.65-2.87 1.48-.62.72-1.16 1.88-1.01 2.99 1.1.08 2.22-.55 2.89-1.37z" />
    </svg>
  );
}

/**
 * Logo Officiel Linux (Tux Penguin Silhouette Vectorielle)
 */
export function LinuxLogo({ size = 20, className = "" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Logo Linux"
    >
      {/* Corps de Tux */}
      <path
        d="M12 2C8.7 2 7.5 4.5 7.5 8C7.5 9.2 7.7 10.4 8 11.5C6.5 13.5 5 16 5 19C5 21.2 7 22 9 22C9.8 22 10.7 21.8 11.5 21.5C12.5 21.5 13.5 21.8 14.5 22C16.8 22 19 21.2 19 19C19 16 17.5 13.5 16 11.5C16.3 10.4 16.5 9.2 16.5 8C16.5 4.5 15.3 2 12 2Z"
        fill="#E5E7EB"
      />
      {/* Veste noire / Ailes */}
      <path
        d="M12 3C9.5 3 8.5 5.2 8.5 8.5C8.5 10 7.8 11.8 6.5 14C5.5 15.8 6 18 6 19C6 19.8 6.5 20.5 7.2 21C6.8 19 7 16 8.5 13.5C9.5 12 9.5 10 9.5 8.5C9.5 6 10.2 4.5 12 4.5C13.8 4.5 14.5 6 14.5 8.5C14.5 10 14.5 12 15.5 13.5C17 16 17.2 19 16.8 21C17.5 20.5 18 19.8 18 19C18 18 18.5 15.8 17.5 14C16.2 11.8 15.5 10 15.5 8.5C15.5 5.2 14.5 3 12 3Z"
        fill="#1F2937"
      />
      {/* Ventre blanc */}
      <ellipse cx="12" cy="15.5" rx="3.5" ry="5" fill="#F9FAFB" />
      {/* Yeux */}
      <circle cx="10.8" cy="6.5" r="0.8" fill="#1F2937" />
      <circle cx="13.2" cy="6.5" r="0.8" fill="#1F2937" />
      {/* Bec orange */}
      <path d="M10 8.2C10 8.2 11 9.8 12 9.8C13 9.8 14 8.2 14 8.2L12 7.5L10 8.2Z" fill="#F59E0B" />
      {/* Pieds orange */}
      <path d="M7.5 21.2C6.5 21.2 6 22 7.5 22.5C9 23 10.5 22.2 10.5 21.5C10.5 21 8.5 21.2 7.5 21.2Z" fill="#F59E0B" />
      <path d="M16.5 21.2C17.5 21.2 18 22 16.5 22.5C15 23 13.5 22.2 13.5 21.5C13.5 21 15.5 21.2 16.5 21.2Z" fill="#F59E0B" />
    </svg>
  );
}

/**
 * Logo Officiel Moodle (Mortier universitaire & "m" emblématique)
 */
export function MoodleLogo({ size = 20, className = "" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Logo Moodle"
    >
      {/* Mortarboard graduation cap au sommet */}
      <path
        d="M12 2L3 6.5L12 11L21 6.5L12 2Z"
        fill="#F98012"
      />
      <path
        d="M21 7.5V12C21 12 19.5 12.8 19.5 11V8.25L12 12L7 9.5V13.5C7 15 9.5 16 12 16C14.5 16 17 15 17 13.5V11"
        stroke="#F98012"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Tassel */}
      <path d="M6 8.5V13L5 14" stroke="#F98012" strokeWidth="1.2" strokeLinecap="round" />
      {/* Lettre "m" Moodle stylisée */}
      <path
        d="M6 21V16.5C6 15.1 7.1 14 8.5 14C9.9 14 11 15.1 11 16.5V21M11 21V16.5C11 15.1 12.1 14 13.5 14C14.9 14 16 15.1 16 16.5V21M16 21H18"
        stroke="#FFFFFF"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Logo Officiel GitHub (Octocat Silhouette)
 */
export function GitHubLogo({ size = 20, className = "" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Logo GitHub"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}
