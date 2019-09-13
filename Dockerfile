#
# uWebSockets build from sources.
#
FROM node:12-alpine AS uws-build

WORKDIR /build

RUN apk update && apk upgrade && \
  apk add --no-cache git openssh && \
  apk add --no-cache clang llvm5-dev alpine-sdk

RUN git clone -b v15.11.0 https://github.com/uNetworking/uWebSockets.js.git ./binaries
RUN git clone --recurse-submodules https://github.com/uNetworking/uWebSockets.js.git ./sources

WORKDIR /build/sources
# Checkout v15.11.0
RUN git checkout --recurse-submodules 317aaf3b75dd5f99e8f9c931884fe0e44ec269cc
RUN make

WORKDIR /build/
RUN mkdir uws
RUN cp -R ./sources/dist/* ./uws/
RUN cp -f ./binaries/index.d.ts ./uws/
RUN cp -f ./binaries/package.json ./uws/

#
# Transpiling.
#
FROM node:12-alpine AS ts-build

WORKDIR /build

RUN apk update && apk upgrade && \
  apk add --no-cache git openssh

COPY --from=uws-build /build/uws ./packages/uws
COPY package*.json ./

RUN npm config set unsafe-perm true
RUN npm uninstall uWebSockets.js
RUN npm i -S ./packages/uws
RUN npm i

COPY tsconfig.prod.json .

COPY ./src ./src
COPY .env.production ./.env

RUN npm run build

#
# Install production dependencied.
#
FROM node:12-alpine AS prod-only

WORKDIR /build

RUN apk update && apk upgrade && \
  apk add --no-cache git openssh

COPY --from=uws-build /build/uws ./packages/uws
COPY package*.json ./

RUN npm config set unsafe-perm true
RUN npm uninstall uWebSockets.js
RUN npm install -S ./packages/uws
RUN npm install --production

#
# Build game server container.
#
FROM node:12-alpine

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

ARG LOG_LEVEL=info
ENV LOG_LEVEL=${LOG_LEVEL}

ARG LOG_TO_CONSOLE=false
ENV LOG_TO_CONSOLE=${LOG_TO_CONSOLE}

ARG LOG_PERFORMANCE_SAMPLES=true
ENV LOG_PERFORMANCE_SAMPLES=${LOG_PERFORMANCE_SAMPLES}

ARG PORT=3501
ENV PORT=${PORT}

ARG ENDPOINTS_TLS=false
ENV ENDPOINTS_TLS=${ENDPOINTS_TLS}

ARG SERVER_TYPE=FFA
ENV SERVER_TYPE=${SERVER_TYPE}

ARG SERVER_ROOM=ab-ffa
ENV SERVER_ROOM=${SERVER_ROOM}

ARG SU_PASSWORD=
ENV SU_PASSWORD=${SU_PASSWORD}

ARG MAX_PLAYERS_PER_IP=3
ENV MAX_PLAYERS_PER_IP=${MAX_PLAYERS_PER_IP}

ARG BOTS_IP=127.0.0.1
ENV BOTS_IP=${BOTS_IP}

WORKDIR /app

RUN mkdir logs
RUN mkdir cache
RUN mkdir certs

COPY --from=ts-build /build/dist dist
COPY --from=prod-only /build/node_modules node_modules
COPY --from=uws-build /build/uws ./packages/uws
COPY ./data ./data
COPY package.json ./

EXPOSE ${PORT}

USER node

CMD [ "node", "./dist/app.js" ]
