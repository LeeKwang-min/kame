FROM node:20-alpine AS builder
WORKDIR /app
COPY server/package.json server/yarn.lock ./server/
COPY shared/ ./shared/
COPY lib/ ./lib/
RUN cd server && yarn install --frozen-lockfile
COPY server/tsconfig.json ./server/
COPY server/src/ ./server/src/
RUN cd server && yarn build

FROM node:20-alpine
WORKDIR /app
COPY server/package.json server/yarn.lock ./server/
RUN cd server && yarn install --frozen-lockfile --production
COPY --from=builder /app/server/dist ./server/dist
EXPOSE 4000
CMD ["node", "server/dist/server/src/index.js"]
