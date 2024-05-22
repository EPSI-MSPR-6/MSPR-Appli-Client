FROM node:20

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY src/ .
COPY config/ .


EXPOSE 8080

CMD ["node", "index.js"]