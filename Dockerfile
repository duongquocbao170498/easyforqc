FROM node:24-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-requests librsvg2-bin ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build \
  && mkdir -p /app/.qa-runs /app/qa/xmind-test-design \
  && chown -R node:node /app

USER node

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=5173
ENV QA_SOURCE_ROOT=/app/vendor/qa-source

EXPOSE 5173

CMD ["npm", "run", "start"]
