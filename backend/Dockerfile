# ─────────────────────────────────────────────────────────────
# Backend SIC — multi-stage: compila TypeScript a dist/ y corre liviano
# Build context: RAÍZ del repo (workspaces npm)
# ─────────────────────────────────────────────────────────────

# ── Etapa 1: construcción ────────────────────────────────────
FROM node:24-alpine AS build
WORKDIR /app

# Dependencias primero (mejor caché de capas)
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci

# Código fuente
COPY backend ./backend
COPY prisma.config.ts ./

# Cliente Prisma generado ANTES de compilar (tsc lo necesita en node_modules/.prisma)
RUN DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder npx prisma generate

# Compilación TypeScript → backend/dist/
RUN npm --workspace @sic/backend run build

# ── Etapa 2: producción (imagen liviana) ─────────────────────
FROM node:24-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

# Solo dependencias de producción
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --omit=dev --workspace @sic/backend --include-workspace-root

# Lo compilado + cliente Prisma generado + esquema y migraciones
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY backend/prisma ./backend/prisma
COPY backend/scripts ./backend/scripts

EXPOSE 3000
# Aplica migraciones (idempotente) y arranca
CMD ["sh", "-c", "node backend/scripts/migrate.mjs && node backend/dist/main.js"]
