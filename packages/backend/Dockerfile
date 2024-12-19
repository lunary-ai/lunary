FROM node:18

WORKDIR /app

COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/
COPY packages/shared/package*.json ./packages/shared/

WORKDIR /app/packages/backend

CMD ["npm", "run", "dev"]
