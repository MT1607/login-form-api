FROM node:18

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --production

COPY . .

ENV NODE_ENV=production

EXPOSE 3001

# Chạy ứng dụng
CMD ["npm", "start"]