FROM node:alpine

# Install deps
COPY package.json package.json
RUN npm install --production

# For prod
CMD npm start
