# Generated by https://smithery.ai. See: https://smithery.ai/docs/config#dockerfile
# syntax=docker/dockerfile:1

# Build stage
FROM node:lts-alpine AS build
WORKDIR /app

# Install dependencies
COPY mcp-server/package.json mcp-server/package-lock.json ./
RUN npm ci --production=false

# Copy source code
COPY mcp-server/tsconfig.json ./tsconfig.json
COPY mcp-server/src ./src

# Build the project
RUN npm run build

# Runtime stage
FROM node:lts-alpine AS runtime
WORKDIR /app

# Copy build artifacts and dependencies
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules

# Default API URL environment variable
ENV CURRENTS_API_URL=https://api.currents.dev

ENTRYPOINT ["node", "build/index.js"]
