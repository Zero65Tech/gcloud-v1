FROM node:18-slim

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --omit=dev

COPY config config
COPY src src

CMD [ "npm", "start" ]
