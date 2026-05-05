# ============================================================
#  Dockerfile — Frontend React (pfe-management)
#  Correction : node:18-alpine (aligné avec la pipeline CI/CD)
# ============================================================

# ── Stage 1 : Build React ───────────────────────────────────
FROM node:18-alpine AS build

WORKDIR /app

# Copier les manifestes en premier pour exploiter le cache Docker
COPY package.json package-lock.json ./

# Installation des dépendances
RUN npm install --legacy-peer-deps && \
    npm install ajv@^8.0.0 ajv-keywords@^5.0.0 --legacy-peer-deps

# Copier le reste du code source
COPY . .

# Build de production
ARG REACT_APP_API_URL=http://localhost:5001
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV NODE_ENV=production
ENV CI=false

RUN npm run build

# ── Stage 2 : Serveur Nginx ─────────────────────────────────
FROM nginx:alpine

# Copier le build React dans Nginx
COPY --from=build /app/build /usr/share/nginx/html

# Copier la config Nginx personnalisée
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Supprimer l'utilisateur root et utiliser nginx user
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown nginx:nginx /var/run/nginx.pid

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]