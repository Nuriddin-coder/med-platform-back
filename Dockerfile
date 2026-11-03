# ── Builder stage ─────────────────────────────────────────────
FROM node:22-alpine AS builder

# Native build tools required by argon2 (C++ addon)
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./

# Install ALL dependencies (including devDependencies for TypeScript build)
RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

# ── Runner stage ──────────────────────────────────────────────
FROM node:22-alpine AS runner

# argon2 needs libstdc++ at runtime
RUN apk add --no-cache libstdc++

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./

# Production-only dependencies
RUN npm ci --omit=dev

# Copy compiled output + Prisma engine from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

# Ensure runtime directories exist
RUN mkdir -p uploads storage/medical-documents

EXPOSE 4000

CMD ["node", "dist/main.js"]
