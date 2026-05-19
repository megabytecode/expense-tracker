# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=20.19.5

FROM node:${NODE_VERSION}-alpine AS frontend-deps
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci

FROM frontend-deps AS frontend-build
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=${VITE_API_URL}
COPY frontend/ ./
RUN npm run build

FROM node:${NODE_VERSION}-alpine AS backend-deps
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci

FROM backend-deps AS backend-build
COPY backend/ ./
RUN npm run prisma:generate && npm run build

FROM node:${NODE_VERSION}-alpine AS backend-prod-deps
WORKDIR /app/backend
COPY backend/package*.json ./
COPY backend/prisma ./prisma
RUN npm ci --omit=dev && npm run prisma:generate && npm cache clean --force

FROM node:${NODE_VERSION}-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV FRONTEND_DIST_DIR=/app/public

RUN apk add --no-cache dumb-init wget \
  && addgroup -S expense \
  && adduser -S expense -G expense

COPY --from=backend-prod-deps --chown=expense:expense /app/backend/node_modules ./backend/node_modules
COPY --from=backend-build --chown=expense:expense /app/backend/dist ./backend/dist
COPY --from=backend-build --chown=expense:expense /app/backend/prisma ./backend/prisma
COPY --from=backend-build --chown=expense:expense /app/backend/prisma.config.ts ./backend/prisma.config.ts
COPY --from=backend-build --chown=expense:expense /app/backend/package.json ./backend/package.json
COPY --from=frontend-build --chown=expense:expense /app/frontend/dist ./public

USER expense
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health >/dev/null || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "backend/dist/index.js"]
