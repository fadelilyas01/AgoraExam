# =============================================================================
# Stage 1: Build de l'Application Frontend (Node.js Alpine)
# =============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Optimisation du cache Docker pour les dépendances
COPY package.json package-lock.json ./

# Installation propre des dépendances avec vérification d'intégrité
RUN npm ci

# Copie du code source et compilation Vite
COPY . .
RUN npm run build

# =============================================================================
# Stage 2: Serveur Nginx Ultra-Léger & Non-Privilégié (Production Runtime)
# =============================================================================
FROM nginxinc/nginx-unprivileged:alpine-slim

# Métadonnées de l'image
LABEL maintainer="AgoraExam Team <contact@agoraexam.org>"
LABEL description="Serveur d'évaluation AgoraExam durci et conteneurisé"
LABEL version="0.1.0"

# Copie de la configuration Nginx durcie
COPY --chown=101:101 nginx.conf /etc/nginx/nginx.conf

# Copie des fichiers compilés depuis le builder
COPY --from=builder --chown=101:101 /app/dist /usr/share/nginx/html

# Exécution sous l'utilisateur non-root 101 (nginx unprivileged)
USER 101

# Port d'écoute non-privilégié (> 1024)
EXPOSE 8080

# Sonde de santé intégrée au conteneur
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:8080/healthz || exit 1

# Démarrage Nginx au premier plan
CMD ["nginx", "-g", "daemon off;"]

