FROM node:20-alpine

WORKDIR /app

# Copy workspace package manifests
COPY package*.json turbo.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Install dependencies
RUN npm ci

# Copy source code
COPY packages/shared ./packages/shared
COPY client ./client

# Build shared library
RUN npm run build --filter=@healos/shared...

WORKDIR /app/client

EXPOSE 3000

CMD ["npm", "run", "dev"]
