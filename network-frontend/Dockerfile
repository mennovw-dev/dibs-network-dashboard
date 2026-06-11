FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
# npm install (not ci): npm's strict lockfile check trips over @emnapi optional
# peer deps pulled in transitively by the build toolchain on Linux.
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build

FROM node:22-alpine

RUN npm install -g serve@14

WORKDIR /app
COPY --from=build /app/dist ./dist

EXPOSE 8012

CMD ["serve", "-s", "dist", "-l", "8012"]
