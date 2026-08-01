FROM node:20-alpine

WORKDIR /app

# Copy workspace package manifests
COPY package*.json turbo.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install dependencies
RUN npm ci

# Copy source code
COPY packages/shared ./packages/shared
COPY server ./server

# Build ONLY the shared library
RUN npx turbo run build --filter=@healos/shared

WORKDIR /app/server

EXPOSE 5000

CMD ["npm", "run", "dev"]
