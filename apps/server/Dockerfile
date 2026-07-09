FROM node:20-alpine
WORKDIR /repo

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json

RUN npm ci

COPY packages/shared packages/shared
COPY apps/server apps/server

RUN npm run build --workspace=packages/shared && npm run build --workspace=apps/server

ENV NODE_ENV=production
EXPOSE 8080
CMD ["npm", "run", "start", "--workspace=apps/server"]
