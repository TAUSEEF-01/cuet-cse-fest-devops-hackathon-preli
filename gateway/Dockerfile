# Production Dockerfile for Gateway Service
# Multi-stage build for optimized image size

# Stage 1: Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files for caching
COPY package*.json ./

# Install all dependencies
RUN npm install

# Prune dev dependencies
RUN npm prune --production

# Stage 2: Production stage
FROM node:20-alpine AS production

# Add labels for better maintainability
LABEL maintainer="hackathon-team"
LABEL description="Gateway service for e-commerce application"

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S gateway -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy only production dependencies and source files
COPY --from=builder --chown=gateway:nodejs /app/node_modules ./node_modules
COPY --chown=gateway:nodejs package*.json ./
COPY --chown=gateway:nodejs src ./src

# Set environment variables
ENV NODE_ENV=production

# Switch to non-root user
USER gateway

# Expose port (this is the only port exposed to the outside world)
EXPOSE 5921

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5921/health || exit 1

# Start the application
CMD ["node", "src/gateway.js"]
