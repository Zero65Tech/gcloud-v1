FROM node:19-slim

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --only=production

COPY config config
COPY src src

CMD [ "npm", "start" ]
