FROM node:20-alpine AS base

WORKDIR /app

ENV NODE_ENV=development

RUN corepack enable pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.json ./
COPY next.config.mjs ./
COPY tailwind.config.ts ./
COPY postcss.config.mjs ./
COPY .eslintrc.json ./
COPY .prettierrc ./

RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 3000

CMD ["pnpm", "dev"]
