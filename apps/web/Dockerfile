FROM node:20-alpine
WORKDIR /repo

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json

RUN npm ci

COPY packages/shared packages/shared
COPY apps/web apps/web

# Next.js inlines NEXT_PUBLIC_* vars at build time, so this must be a build
# arg (baked into the image), not a runtime secret.
ARG NEXT_PUBLIC_SERVER_URL
ENV NEXT_PUBLIC_SERVER_URL=$NEXT_PUBLIC_SERVER_URL

RUN npm run build --workspace=packages/shared && npm run build --workspace=apps/web

ENV NODE_ENV=production
EXPOSE 8080
CMD ["npm", "run", "start", "--workspace=apps/web"]
