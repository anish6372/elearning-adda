# Multi-stage build: dependencies are installed once, the runtime image has prod deps only
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# multer writes temp uploads here before they go to Cloudinary
RUN mkdir -p uploads && chown -R node:node /app
USER node

EXPOSE 5001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:5001/health || exit 1

CMD ["node", "server.js"]
