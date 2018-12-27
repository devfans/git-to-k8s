FROM node:alpine

# Install deps
COPY package.json package.json
COPY index.js index.js
RUN npm install --production

# For prod
CMD npm start
