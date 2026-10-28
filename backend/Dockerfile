# --- Build stage: install all deps (including prisma CLI) and generate client ---
FROM node:20-alpine AS builder
WORKDIR /app

# Prisma 7 binary engine needs OpenSSL on Alpine
RUN apk add --no-cache openssl

# Install deps with devDeps so prisma CLI is present for `prisma generate`
COPY package.json package-lock.json ./
RUN npm ci

# Copy prisma schema + config first (cache layer)
COPY prisma ./prisma
COPY prisma.config.ts ./

# Generate the Prisma client into src/generated/prisma
RUN npx prisma generate

# Copy the rest of the source
COPY src ./src

# Drop dev deps to slim the runtime image
RUN npm prune --omit=dev


# --- Runtime stage: minimal image, runs as non-root ---
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl tini \
    && addgroup -S app && adduser -S app -G app

# Copy only what we need from the builder
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/src ./src
COPY --from=builder --chown=app:app /app/prisma ./prisma
COPY --from=builder --chown=app:app /app/prisma.config.ts ./
COPY --from=builder --chown=app:app /app/package.json ./

USER app
EXPOSE 3001

# Use tini for proper SIGTERM/SIGINT forwarding (dialer worker shutdown)
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/index.js"]
