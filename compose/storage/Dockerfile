FROM node:18-alpine

WORKDIR /app

COPY package.json .

COPY index.js .

RUN npm install --only=production

ENV PORT=80

CMD npm start