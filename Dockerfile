FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install --production

COPY . .

ENV NODE_ENV=production
ENV PORT=3000
ENV MONGODB_URI=mongodb://mongodb:27017/cybee
ENV REDIS_HOST=redis
ENV REDIS_PORT=6379
ENV ELASTICSEARCH_NODE=http://elasticsearch:9200

EXPOSE 3000

CMD ["node", "src/index.js"]
