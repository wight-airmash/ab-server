FROM node:12-alpine AS updated-node-alpine

RUN apk update && apk upgrade

#
# The preparation stage for use during the installation
# of app dependencies.
#
FROM updated-node-alpine AS build-ready

RUN apk add --no-cache git openssh

#
# Install depencencies from package.json
#
FROM build-ready AS app-js-depencencies

WORKDIR /build

COPY package*.json ./

RUN npm config set unsafe-perm true
RUN npm i --silent --quiet

#
# Transpiling (development).
#
FROM app-js-depencencies AS app-development-build

COPY tsconfig.json ./
COPY ./src ./src
COPY .env.example ./.env

RUN npm run build:dev

#
# Transpiling (production).
#
FROM app-js-depencencies AS app-production-build

COPY tsconfig.prod.json ./
COPY ./src ./src
COPY .env.production ./.env

RUN npm run build

#
# Removing non-production dependencies from node_modules.
#
FROM app-production-build AS production-js-dependencies

RUN npm prune --production

#
# Building game server image (development).
#
FROM updated-node-alpine as development-image

# Install uWebSockets deps.
RUN apk add --no-cache gcompat
RUN rm -rf /var/cache/apk/*

WORKDIR /app

RUN mkdir logs && chown -R node: logs
RUN mkdir cache && chown -R node: cache
RUN mkdir certs && chown -R node: certs

COPY --from=app-development-build /build/dist ./dist
COPY --from=app-js-depencencies /build/node_modules ./node_modules
COPY --chown=node:node ./admin ./admin
COPY --chown=node:node ./data ./data
COPY package.json ./

ARG NODE_ENV=development
ENV NODE_ENV=${NODE_ENV}

ARG LOG_LEVEL=debug
ENV LOG_LEVEL=${LOG_LEVEL}

ARG LOG_TO_CONSOLE=true
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

ARG SERVER_BOT_NAME=Server
ENV SERVER_BOT_NAME=${SERVER_BOT_NAME}

ARG SERVER_BOT_FLAG=JOLLY
ENV SERVER_BOT_FLAG=${SERVER_BOT_FLAG}

ARG ALLOW_NON_ASCII_USERNAMES=false
ENV ALLOW_NON_ASCII_USERNAMES=${ALLOW_NON_ASCII_USERNAMES}

ARG MODERATION_PANEL=true
ENV MODERATION_PANEL=${MODERATION_PANEL}

ARG MODERATION_PANEL_URL_ROUTE=admin
ENV MODERATION_PANEL_URL_ROUTE=${MODERATION_PANEL_URL_ROUTE}

ARG SU_PASSWORD=
ENV SU_PASSWORD=${SU_PASSWORD}

ARG MAX_PLAYERS_PER_IP=3
ENV MAX_PLAYERS_PER_IP=${MAX_PLAYERS_PER_IP}

ARG BOTS_IP=127.0.0.1
ENV BOTS_IP=${BOTS_IP}

ARG USER_ACCOUNTS=true
ENV USER_ACCOUNTS=${USER_ACCOUNTS}

ARG STATS_SYNC=false
ENV STATS_SYNC=${STATS_SYNC}

ARG AUTH_LOGIN_SERVER_KEY_URL=
ENV AUTH_LOGIN_SERVER_KEY_URL=${AUTH_LOGIN_SERVER_KEY_URL}

ARG PACKETS_FLOODING_AUTOBAN=true
ENV PACKETS_FLOODING_AUTOBAN=${PACKETS_FLOODING_AUTOBAN}

ARG AFK_DISCONNECT_TIMEOUT=
ENV AFK_DISCONNECT_TIMEOUT=${AFK_DISCONNECT_TIMEOUT}

ARG WEBSOCKETS_COMPRESSION=true
ENV WEBSOCKETS_COMPRESSION=${WEBSOCKETS_COMPRESSION}

ENV EXPERIMENTAL_FASTCALL=1

EXPOSE ${PORT}

USER node

CMD [ "node", "./dist/app.js" ]

#
# Building game server image (production).
#
FROM updated-node-alpine as production-image

# Install uWebSockets deps.
RUN apk add --no-cache gcompat
RUN rm -rf /var/cache/apk/*

WORKDIR /app

RUN mkdir logs && chown -R node: logs
RUN mkdir cache && chown -R node: cache
RUN mkdir certs && chown -R node: certs

COPY --from=app-production-build /build/dist ./dist
COPY --from=production-js-dependencies /build/node_modules ./node_modules
COPY --chown=node:node ./admin ./admin
COPY --chown=node:node ./data ./data
COPY package.json ./

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

ARG SERVER_BOT_NAME=Server
ENV SERVER_BOT_NAME=${SERVER_BOT_NAME}

ARG SERVER_BOT_FLAG=JOLLY
ENV SERVER_BOT_FLAG=${SERVER_BOT_FLAG}

ARG ALLOW_NON_ASCII_USERNAMES=false
ENV ALLOW_NON_ASCII_USERNAMES=${ALLOW_NON_ASCII_USERNAMES}

ARG MODERATION_PANEL=true
ENV MODERATION_PANEL=${MODERATION_PANEL}

ARG MODERATION_PANEL_URL_ROUTE=admin
ENV MODERATION_PANEL_URL_ROUTE=${MODERATION_PANEL_URL_ROUTE}

ARG SU_PASSWORD=
ENV SU_PASSWORD=${SU_PASSWORD}

ARG MAX_PLAYERS_PER_IP=3
ENV MAX_PLAYERS_PER_IP=${MAX_PLAYERS_PER_IP}

ARG BOTS_IP=127.0.0.1
ENV BOTS_IP=${BOTS_IP}

ARG USER_ACCOUNTS=true
ENV USER_ACCOUNTS=${USER_ACCOUNTS}

ARG AUTH_LOGIN_SERVER_KEY_URL=
ENV AUTH_LOGIN_SERVER_KEY_URL=${AUTH_LOGIN_SERVER_KEY_URL}

ARG PACKETS_FLOODING_AUTOBAN=true
ENV PACKETS_FLOODING_AUTOBAN=${PACKETS_FLOODING_AUTOBAN}

ARG AFK_DISCONNECT_TIMEOUT=
ENV AFK_DISCONNECT_TIMEOUT=${AFK_DISCONNECT_TIMEOUT}

ARG WEBSOCKETS_COMPRESSION=true
ENV WEBSOCKETS_COMPRESSION=${WEBSOCKETS_COMPRESSION}

ENV EXPERIMENTAL_FASTCALL=1

EXPOSE ${PORT}

USER node

CMD [ "node", "./dist/app.js" ]
