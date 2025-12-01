# Production Dockerfile for Backend Service
# Multi-stage build for optimized image size

# Stage 1: Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files for caching (leverages Docker layer caching)
COPY package*.json ./

# Install all dependencies (including dev for building)
RUN npm install --prefer-offline --no-audit

# Copy source code
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript to JavaScript
RUN npm run build

# Prune dev dependencies after build
RUN npm prune --production

# Stage 2: Production stage
FROM node:20-alpine AS production

# Add labels for better maintainability (OCI standard labels)
LABEL maintainer="hackathon-team"
LABEL description="Backend service for e-commerce application"
LABEL org.opencontainers.image.source="https://github.com/hackathon/backend"
LABEL org.opencontainers.image.vendor="Hackathon Team"
LABEL org.opencontainers.image.title="Backend API"
LABEL org.opencontainers.image.description="E-commerce backend API service"

# Install tini for proper signal handling (PID 1 zombie reaping)
RUN apk add --no-cache tini

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S backend -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy only production dependencies and built files
COPY --from=builder --chown=backend:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=backend:nodejs /app/dist ./dist
COPY --from=builder --chown=backend:nodejs /app/package*.json ./

# Set environment variables
ENV NODE_ENV=production
# Reduce npm spam and improve security
ENV NPM_CONFIG_LOGLEVEL=warn
ENV NPM_CONFIG_FUND=false

# Switch to non-root user
USER backend

# Expose port (internal only, not published to host)
EXPOSE 3847

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3847/api/health || exit 1

# Use tini as entrypoint for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application
CMD ["node", "dist/index.js"]
