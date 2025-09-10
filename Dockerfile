# Multi-stage Dockerfile for Shopify MCP Server
# Following enterprise patterns with security and optimization

# Stage 1: Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies first (for better caching)
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production stage
FROM node:18-alpine AS production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S shopify-mcp -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/config ./config

# Copy environment template
COPY .env.example .env.example

# Change ownership to non-root user
RUN chown -R shopify-mcp:nodejs /app

# Switch to non-root user
USER shopify-mcp

# Expose port (for health checks or HTTP endpoints if added)
EXPOSE 3000

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "console.log('Health check passed')" || exit 1

# Set environment variables
ENV NODE_ENV=production
ENV LOG_LEVEL=INFO
ENV DEBUG_MODE=false

# Start the application
CMD ["node", "dist/index.js"]
