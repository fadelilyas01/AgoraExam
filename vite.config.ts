import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],
  // Base path dynamique : "/" pour Vercel, Netlify et Tauri ; "/AgoraExam/" pour GitHub Pages
  base: process.env.VITE_BASE_PATH || (process.env.GITHUB_PAGES === "true" ? "/AgoraExam/" : "/"),

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: true,
  },
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "lucide-react"],
          mediapipe: ["@mediapipe/tasks-vision"],
        },
      },
    },
  },
}));
