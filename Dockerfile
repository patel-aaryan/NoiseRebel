FROM node:lts-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY src/ ./src/
COPY audios/ ./audios/
COPY soundboard/ ./soundboard/

CMD ["node", "src/index.js"]
