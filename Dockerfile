# Stage 1: Base image
FROM node:20-alpine AS base

# Stage 2: Install dependencies
FROM base AS deps
# Install build tools needed for native modules (better-sqlite3)
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Stage 3: Build the application
FROM base AS builder

WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy all source files
COPY . .

# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application
RUN npm run build

# Stage 4: Production runner
FROM base AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create nodejs group and nextjs user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public folder from builder
COPY --from=builder /app/public ./public

# Copy schema.sql for database initialization
COPY --from=builder /app/src/lib/db/schema.sql ./src/lib/db/schema.sql

# Create .next directory and set ownership
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy standalone output with correct ownership
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Create data directory for SQLite database with correct ownership
RUN mkdir -p /app/data
RUN chown nextjs:nodejs /app/data

# Switch to non-root user
USER nextjs

# Expose the application port
EXPOSE 3000

# Set runtime environment variables
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the application
CMD ["node", "server.js"]
