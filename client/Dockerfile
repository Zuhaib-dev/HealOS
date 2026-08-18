FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json turbo.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY client/package*.json ./client/
COPY server/package*.json ./server/
RUN npm ci

COPY packages/shared ./packages/shared
COPY client ./client
RUN npx turbo run build --filter=@healos/shared
RUN npx turbo run build --filter=@healos/client

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/client/public ./client/public
COPY --from=builder /app/client/.next/standalone ./
COPY --from=builder /app/client/.next/static ./client/.next/static

EXPOSE 3000

CMD ["node", "client/server.js"]
