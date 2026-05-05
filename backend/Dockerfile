# ============================================================
#  Dockerfile — Backend Express (pfe-management)
#  Node 18 LTS Alpine — multi-stage pour image légère
# ============================================================

# ── Stage 1 : Installation des dépendances ──────────────────
FROM node:18-alpine AS deps

WORKDIR /app

# Copier les manifestes uniquement (cache layer)
COPY package.json package-lock.json ./

# Installer uniquement les dépendances de production
RUN npm install --omit=dev --ignore-scripts

# ── Stage 2 : Image finale ───────────────────────────────────
FROM node:18-alpine AS production

# Créer un utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 -G nodejs

WORKDIR /app

# Copier les dépendances depuis le stage deps
COPY --from=deps --chown=nodeuser:nodejs /app/node_modules ./node_modules

# Copier le code source
COPY --chown=nodeuser:nodejs . .

# Créer le dossier uploads si nécessaire
RUN mkdir -p uploads && chown nodeuser:nodejs uploads

# Variables d'environnement par défaut (surchargées par docker-compose)
ENV NODE_ENV=production
ENV PORT=5000

# Basculer sur l'utilisateur non-root
USER nodeuser

EXPOSE 5000

# Healthcheck pour docker-compose depends_on
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

CMD ["node", "server.js"]