# Stage 1: build the React frontend
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/
RUN npm ci

COPY client/ ./client/
COPY server/ ./server/
RUN npm run build

# Stage 2: production server (no dev deps, no client source)
FROM node:22-alpine AS runner
WORKDIR /app

COPY server/package.json ./server/
RUN npm install --prefix server --omit=dev

COPY server/ ./server/
COPY --from=builder /app/server/public ./server/public
COPY tools.json ./

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "server/index.js"]
