FROM node:24-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-venv python3-pip \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
COPY analyser/requirements.txt analyser/requirements.txt
RUN npm ci --ignore-scripts

COPY . .
RUN npm run build

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=10000 \
    ALLOW_OFFLINE_CACHE=false

EXPOSE 10000
CMD ["node", "--env-file-if-exists=.env", "server/index.mjs"]
