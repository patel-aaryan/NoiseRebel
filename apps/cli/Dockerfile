FROM node:lts-alpine

RUN apk add --no-cache yt-dlp ffmpeg python3
RUN corepack enable pnpm

WORKDIR /app

COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
COPY package.json ./

# Copy everything
COPY . .

# Install dependencies (ignoring scripts to be safe)
RUN pnpm install --frozen-lockfile --ignore-scripts

# Set the working directory to the cli app
WORKDIR /app/apps/cli

ENV AUDIOS_DIR=/app/apps/bot/audios

CMD ["pnpm", "start"]
