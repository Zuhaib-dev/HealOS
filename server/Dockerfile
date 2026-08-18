FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json turbo.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY server/package*.json ./server/
COPY client/package*.json ./client/
RUN npm ci

COPY packages/shared ./packages/shared
COPY server ./server
RUN npx turbo run build --filter=@healos/shared
RUN npx turbo run build --filter=@healos/server

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5001

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/server/package*.json ./server/
COPY --from=builder /app/packages/shared/package*.json ./packages/shared/
RUN npm ci --omit=dev

COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

EXPOSE 5001

CMD ["node", "server/dist/server.js"]
