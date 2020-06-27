# ab-server

Game server.

Docs:

- [In-game commands](./docs/commands.md).
- [Environment variables](./docs/env-variables.md).
- [JSON API](./docs/api.md).
- [Aircrafts damage](./docs/damage.md).
- [CTF mode Q-bots](./docs/ctf-bots.md) (not a server part).

## Installation

Requirements:

- Node.js 12.
- uWebSockets.js is C++ lib and distributed in binary files for the most popular operation systems, so it is unlikely, but you may have to compile it from source if you use an unpopular OS.

Development:

```sh
npm i
cp .env.example .env
```

Set `SU_PASSWORD` variable value.

Build

```sh
npm run build:dev
```

or watch

```sh
npm run watch
```

And start

```sh
npm run start
```

## Settings

Available [environment variables](./docs/env-variables.md).

## User accounts

The current implementation does not support accounts synchronization between server instances.

User accounts data are stored in `./data/user-stats.json` and in memory during the server run. Set `USER_ACCOUNTS` to `false` to turn user accounts off.

Each user session is signed by the [login server](https://github.com/airmash-refugees/airmash-backend) (Ed25519). Validation uses the public key, which is downloaded when the server starts. To change the default key server URL set `AUTH_LOGIN_SERVER_KEY_URL` variable value (only https is supported).

## Moderation Panel

The server exports a `/admin` URL to allow privileged players to moderate the
game, and a public log to allow everyone to see moderation actions.

Add passwords to `admin/passwords.txt` like so:

```
wight:somepasswordforwight
```

The username is only used to enter a name into the log.

Set `MODERATION_PANEL` to `false` to turn moderation panel off. To change panel URL set `MODERATION_PANEL_URL_ROUTE` variable value (`admin` by default).

## "How to run" examples

### Docker

.env.production is default .env file for docker image.

1. Build an image.
   `docker build --target production-image --pull -t airbattle-server .`
2. Run. Don't forget to pass envirounment variables and mount the volumes you need. Example:

   `docker run -v /host/logs:/app/logs -v /host/data:/app/data -p 3501:3501 -e SERVER_TYPE=FFA -e SU_PASSWORD=mypass airbattle-server`

   If you want to use TLS also mount `/app/certs` to the host directory with `privkey.pem` and `fullchain.pem`, and set ENDPOINTS_TLS=true.

Use `development-image` stage to build development image.

### Run directly or behind the proxy

```sh
cp .env.production .env
npm i
npm run build
npm prune --production
node ./dist/app.js
```

or use some kind of process managers.

If you run the server behind the proxy it is important to pass the real IP to the server (`X-Real-IP` or `X-Forwarded-For` header).

## Contribution

1. Server performance is important. Some bots (like https://github.com/airmash-refugees/airmash_bot) generate many packets espesially in `-follow me` mode, you can use them to test.
2. There are eslint rules here, please don't forget about this.
