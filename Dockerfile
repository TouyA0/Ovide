# ── Build client ────────────────────────────────────────────────────────────
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ── Build server ────────────────────────────────────────────────────────────
FROM node:20-alpine AS server-build
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npm run build

# ── Production image ─────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app
# Dépendances prod uniquement
COPY server/package*.json ./
RUN npm ci --omit=dev
# Artefacts
COPY --from=server-build /app/server/dist ./dist
COPY --from=client-build /app/client/dist ./public
# Volume DB
RUN mkdir -p /app/data
EXPOSE 3000
CMD ["node", "dist/index.js"]
