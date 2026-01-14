FROM node:20-alpine

WORKDIR /app

# cài deps trước để cache tốt
COPY package*.json ./
RUN npm ci --omit=dev

# copy source
COPY . .

ENV NODE_ENV=production
EXPOSE 7474

# nếu bạn có script start khác thì đổi lại
CMD ["node", "src/server.js"]