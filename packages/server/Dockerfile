# Optimaiz Server - Production Dockerfile
# Build: docker build -t optimaiz/server .
# Run: docker run -p 3456:3456 -v optimaiz-data:/data optimaiz/server

FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install pnpm and dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build
RUN pnpm build:server

# Production image
FROM node:20-alpine

WORKDIR /app

# Install runtime dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/ui/dist ./ui/dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# Create data directory
RUN mkdir -p /data

# Environment
ENV NODE_ENV=production
ENV PORT=3456
ENV DB_PATH=/data/optimaiz.db

# Expose port
EXPOSE 3456

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3456/health || exit 1

# Run server
CMD ["node", "dist/cli.js", "--db", "/data/optimaiz.db"]
