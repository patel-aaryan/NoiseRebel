FROM node:lts-alpine

RUN corepack enable pnpm

WORKDIR /app

COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
COPY package.json ./

# Copy everything
COPY . .

# Install dependencies (ignoring scripts to be safe)
RUN pnpm install --frozen-lockfile --ignore-scripts

# Set the working directory to the bot app
WORKDIR /app/apps/bot

# Create necessary directories
RUN mkdir -p audios soundboard

ENV AUDIOS_DIR=/app/apps/bot/audios

CMD ["node", "src/index.js"]
