# ── Build client ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ── Build server (better-sqlite3 nécessite des outils natifs) ─────────────────
FROM node:20-alpine AS server-build
RUN apk add --no-cache python3 make g++
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npm run build && npm prune --omit=dev

# ── Image de production ───────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app/server

# Modules déjà compilés (inclut better-sqlite3 natif)
COPY --from=server-build /app/server/node_modules ./node_modules
# Code compilé du serveur
COPY --from=server-build /app/server/dist ./dist
# Client buildé servi comme statique
COPY --from=client-build /app/client/dist ./public

# Répertoires persistants (montés via volumes)
RUN mkdir -p /app/data /app/uploads/receipts

ENV DB_PATH=/app/data/comptes.db
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/index.js"]
