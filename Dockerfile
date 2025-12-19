# --- Stage 1: Builder ---
# Use the full Node.js image to build the app
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files and install dependencies
COPY package.json yarn.lock ./
# If you use npm instead of yarn, change this to:
# COPY package.json package-lock.json ./
# RUN npm ci
RUN yarn install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Set build-time env vars
ENV NEXT_TELEMETRY_DISABLED 1

# Build the Next.js application for standalone output
RUN yarn build

# --- Stage 2: Production ---
# Use a minimal, non-root image for the final stage
FROM node:20-alpine

WORKDIR /app

# Set environment to production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED 1

# Create a non-root user and group
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# --- HARDENING STEP 1: Remove unnecessary tools ---
# This prevents attackers from downloading external scripts.
RUN apk --no-cache del wget curl bash

# Copy only the necessary standalone output from the builder stage
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to the non-root user
USER nextjs

EXPOSE 3000
ENV PORT 3000

# Command to run the app
CMD ["node", "server.js"]