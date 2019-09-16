# ab-server

Game server.

Features:

- [in-game commands](./docs/commands.md).

## Installation

Requirements:

- Node.js 12 (works on older versions too, but compatibility isn't guaranteed).
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

Please see .env.example.

## "How to run" examples

### Docker

.env.production is default .env file for docker image.

1. Build an image.
   `docker build -t airbattle-server .`
2. Run. Don't forget to pass envirounment variables and mount the volumes you need. Example:

   `docker run -v /host/logs:/app/logs -p 3501:3501 -e SERVER_TYPE=FFA -e SU_PASSWORD=mypass airbattle-server`

   If you want to use TLS also mount `/app/certs` to the host directory with `privkey.pem` and `fullchain.pem`, and set ENDPOINTS_TLS=true.

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

1. Server performance is important. Some bots (like https://github.com/username2234/airmash_bot) generate many packets espesially in `-follow me` mode, you can use them to test.
2. There are eslint rules here, please don't forget about this.
