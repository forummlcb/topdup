FROM node:15.11.0

WORKDIR /usr/src/app

COPY . .

RUN npm install \
    && npm run build

EXPOSE 5000

CMD ["node", "dist/src/bin/www.js"]
