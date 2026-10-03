# syntax=docker/dockerfile:1

# ---- dependencies ----
FROM node:20-bookworm AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- build ----
FROM node:20-bookworm AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY src ./src
COPY prompts ./prompts
COPY tsconfig.json ./
RUN npm run build

# ---- runtime ----
FROM node:20-bookworm AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prompts ./prompts
USER node
EXPOSE 4000
CMD ["node", "dist/index.js"]
