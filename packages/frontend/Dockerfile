FROM node:18

WORKDIR /app

COPY package*.json ./
COPY packages/frontend/package*.json ./packages/frontend/
COPY packages/shared/package*.json ./packages/shared/

WORKDIR /app/packages/frontend

CMD ["npm", "run", "dev"]
