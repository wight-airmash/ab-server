import uws from 'uWebSockets.js';
import util from 'util';
import fs from 'fs';
import querystring from 'querystring';
import {
  CHAT_SUPERUSER_MUTE_TIME_MS,
  CONNECTIONS_STATUS,
  CONNECTIONS_IDLE_TIMEOUT_SEC,
  CONNECTIONS_MAX_PAYLOAD_BYTES,
  CONNECTIONS_PACKET_LOGIN_TIMEOUT_MS,
  CONNECTIONS_PLAYERS_TO_CONNECTIONS_MULTIPLIER,
  CONNECTIONS_SUPERUSER_BAN_MS,
  UPGRADES_ACTION_TYPE,
} from '@/constants';
import GameServer from '@/core/server';
import {
  CONNECTIONS_BREAK,
  CONNECTIONS_CLOSED,
  TIMEOUT_LOGIN,
  CONNECTIONS_PACKET_RECEIVED,
  CONNECTIONS_BAN_IP,
  CONNECTIONS_UNBAN_IP,
  RESPONSE_PLAYER_BAN,
  RESPONSE_PLAYER_UPGRADE,
  RESPONSE_SCORE_UPDATE,
  PLAYERS_KICK,
  CHAT_MUTE_BY_SERVER,
  CHAT_MUTE_BY_IP,
} from '@/events';
import { ConnectionMeta, PlayerConnection, IPv4 } from '@/types';
import Logger from '@/logger';

const readFile = util.promisify(fs.readFile);

function readRequest(res, cb, err): void {
  let buffer = Buffer.alloc(0);

  res.onAborted(err);
  res.onData((ab, isLast) => {
    buffer = Buffer.concat([buffer, Buffer.from(ab)]);

    if (isLast) {
      try {
        cb(buffer.toString());
      } catch (e) {
        res.close();
      }
    }
  });
}

export default class WsEndpoint {
  protected uws: uws.TemplatedApp;

  protected app: GameServer;

  protected log: Logger;

  protected moderatorActions: Array<string> = [];

  async getModeratorByPassword(password: string): string | undefined {
    let file;

    try {
      file = await readFile(this.app.config.admin.passwordsPath);
    } catch (e) {
      this.log.error(`Cannot read mod passwords: ${e}`);

      return undefined;
    }

    for (const line in Object.values(file.toString().split('\n'))) {
      const [name, test] = line.split(':');

      if (test === password) {
        return name;
      }
    }

    this.log.error('Failed mod password attempt');

    return undefined;
  }

  async onActionsPost(res: uws.HttpResponse, requestData: string): void {
    const params = querystring.parse(requestData);

    const mod = await this.getModeratorByPassword(params.password as string);

    if (!mod) {
      res.end('Invalid password');

      return;
    }

    const playerId = parseInt(params.playerid as string, 10);
    const player = this.app.storage.playerList.get(playerId);

    if (!player) {
      res.end('Invalid player');

      return;
    }

    switch (params.action) {
      case 'Mute':
        this.log.info(`Muting player ${playerId}`);
        this.app.events.emit(CHAT_MUTE_BY_SERVER, playerId);
        break;
      case 'IpMute':
        this.log.info(`Muting IP: ${player.ip.current}`);
        this.app.events.emit(CHAT_MUTE_BY_IP, player.ip.current, CHAT_SUPERUSER_MUTE_TIME_MS);
        break;
      case 'Sanction':
        this.log.info(`Sanctioning player ${playerId}`);
        player.upgrades.amount = 0;
        player.upgrades.speed = 0;
        player.upgrades.defense = 0;
        player.upgrades.energy = 0;
        player.upgrades.missile = 0;
        this.app.events.emit(RESPONSE_PLAYER_UPGRADE, playerId, UPGRADES_ACTION_TYPE.LOST);
        player.score.current = 0;
        player.earningscore.current = 0;
        this.app.events.emit(RESPONSE_SCORE_UPDATE, playerId);
        break;
      case 'Ban':
        this.log.info(`Banning IP: ${player.ip.current}`);
        this.app.events.emit(
          CONNECTIONS_BAN_IP,
          player.ip.current,
          CONNECTIONS_SUPERUSER_BAN_MS,
          mod
        );
        this.app.events.emit(PLAYERS_KICK, playerId);
        break;
      default:
        res.end('Invalid action');

        return;
    }

    this.moderatorActions.push(
      JSON.stringify({
        date: Date.now(),
        who: mod,
        action: params.action,
        victim: player.name.current,
        reason: params.reason,
      })
    );

    while (this.moderatorActions.length > 100) {
      this.moderatorActions.shift();
    }

    res.end('OK');
  }

  constructor({ app }) {
    this.app = app;
    this.log = this.app.log;

    if (app.config.tls) {
      this.uws = uws.SSLApp({
        key_file_name: `${app.config.certs.path}/privkey.pem`, // eslint-disable-line
        cert_file_name: `${app.config.certs.path}/fullchain.pem`, // eslint-disable-line
      });
    } else {
      this.uws = uws.App({});
    }

    this.uws
      .ws('/*', {
        compression: 1,
        maxPayloadLength: CONNECTIONS_MAX_PAYLOAD_BYTES,
        idleTimeout: CONNECTIONS_IDLE_TIMEOUT_SEC,

        open: (ws: PlayerConnection, req) => {
          const connectionId = this.app.helpers.createConnectionId();
          const now = Date.now();

          this.app.storage.connectionList.set(connectionId, ws);

          ws.meta = {
            id: connectionId,
            ip: WsEndpoint.decodeIPv4(ws.getRemoteAddress()),
            isBackup: false,
            isMain: false,
            status: CONNECTIONS_STATUS.OPENED,
            headers: {},
            isBot: false,
            player: null,
            playerId: null,
            teamId: null,
            userId: null,
            lastMessageMs: now,
            createdAt: now,

            periodic: {
              ping: null,
            },

            timeouts: {
              login: null,
              ack: null,
              backup: null,
              pong: null,
              respawn: null,
            },

            pending: {
              login: false,
              respawn: false,
              spectate: false,
            },

            limits: {
              any: 0,
              chat: 0,
              key: 0,
              respawn: 0,
              spectate: 0,
              su: 0,
              debug: 0,
              spam: 0,
            },
          } as ConnectionMeta;

          if (req.getHeader('x-forwarded-for') !== '') {
            ws.meta.ip = req.getHeader('x-forwarded-for');
          } else if (req.getHeader('x-real-ip') !== '') {
            ws.meta.ip = req.getHeader('x-real-ip');
          }

          this.log.debug(`Open connection id${connectionId}, ${req.getMethod()}, ${ws.meta.ip}`);

          /**
           * Detect bots.
           */
          if (this.app.config.whitelist === false || this.app.storage.ipWhiteList.has(ws.meta.ip)) {
            ws.meta.isBot = true;

            if (this.app.config.whitelist === false) {
              this.log.debug(
                `Connection id${connectionId} IP ${ws.meta.ip} is a bot (whitelist is disabled).`
              );
            } else {
              this.log.debug(
                `Connection id${connectionId} IP ${ws.meta.ip} is in a white list (bot).`
              );
            }
          }

          /**
           * Ban check.
           */
          if (this.app.storage.ipBanList.has(ws.meta.ip)) {
            if (this.app.storage.ipBanList.get(ws.meta.ip).expire > ws.meta.createdAt) {
              this.log.info('IP is banned. Connection refused.', {
                ip: ws.meta.ip,
                connection: connectionId,
              });

              this.app.events.emit(RESPONSE_PLAYER_BAN, connectionId);

              setTimeout(() => {
                this.app.events.emit(CONNECTIONS_BREAK, connectionId);
              }, 100);

              return;
            }

            this.app.events.emit(CONNECTIONS_UNBAN_IP, ws.meta.ip);
          }

          req.forEach((key, value) => {
            ws.meta.headers[key] = value;
            this.log.debug(`Connection id${connectionId} header: '${key}': '${value}'`);
          });

          /**
           * Max IP connections check.
           */
          let connectionsCounter = 1;

          if (this.app.storage.connectionByIPCounter.has(ws.meta.ip)) {
            connectionsCounter = this.app.storage.connectionByIPCounter.get(ws.meta.ip) + 1;
          }

          if (
            connectionsCounter >
              this.app.config.maxPlayersPerIP * CONNECTIONS_PLAYERS_TO_CONNECTIONS_MULTIPLIER &&
            !this.app.storage.ipWhiteList.has(ws.meta.ip)
          ) {
            this.log.info('Max connections per IP reached. Connection refused.', {
              ip: ws.meta.ip,
              connection: connectionId,
            });

            this.app.events.emit(CONNECTIONS_BREAK, connectionId);
          } else {
            this.app.storage.connectionByIPCounter.set(ws.meta.ip, connectionsCounter);

            /**
             * Awaiting for Login package.
             */
            ws.meta.timeouts.login = setTimeout(() => {
              this.app.events.emit(TIMEOUT_LOGIN, connectionId);
            }, CONNECTIONS_PACKET_LOGIN_TIMEOUT_MS);
          }
        },

        message: (ws: PlayerConnection, message, isBinary) => {
          if (isBinary) {
            try {
              this.app.events.emit(CONNECTIONS_PACKET_RECEIVED, message, ws.meta.id);
            } catch (err) {
              this.log.error(`Connection id${ws.meta.id} error.`, err.stack);
            }
          } else {
            this.log.debug(`Connection id${ws.meta.id} message isn't binary.`);
            this.app.events.emit(CONNECTIONS_BREAK, ws.meta.id);
          }
        },

        drain: ws => {
          this.log.debug(`WebSocket backpressure: ${ws.getBufferedAmount()}`);
        },

        close: (ws: PlayerConnection, code) => {
          this.log.debug(`Connection id${ws.meta.id} was closed, code ${code}`);

          const connectionsCounter = this.app.storage.connectionByIPCounter.get(ws.meta.ip) - 1;

          if (connectionsCounter === 0) {
            this.app.storage.connectionByIPCounter.delete(ws.meta.ip);
          } else {
            this.app.storage.connectionByIPCounter.set(ws.meta.ip, connectionsCounter);
          }

          try {
            this.app.events.emit(CONNECTIONS_CLOSED, ws.meta.id);
          } catch (err) {
            this.log.error(`Connection id${ws.meta.id} closing error.`, err.stack);
          }
        },
      })
      .get('/ping', res => {
        res.end('{"pong":1}');
      })
      .get('/', res => {
        res.end(`{"players":${this.app.storage.playerList.size}}`);
      })
      .get('/actions', res => {
        res.writeHeader('Content-type', 'application/json');
        res.end(`[${this.moderatorActions.join(',\n')}]`);
      })
      .post('/actions', res => {
        readRequest(
          res,
          requestData => {
            this.onActionsPost(res, requestData);
          },
          () => {
            this.log.error('failed to parse /actions POST');
          }
        );
      })
      .get('/players', res => {
        const list = [];

        for (const player of this.app.storage.playerList.values()) {
          list.push({
            name: player.name.current,
            id: player.id.current,
            captures: player.captures.current,
            spectate: player.spectate.current,
            kills: player.kills.current,
            deaths: player.deaths.current,
            score: player.score.current,
            lastMove: player.times.lastMove,
            ping: player.ping.current,
            flag: player.flag.current,
          });
        }

        res.writeHeader('Content-type', 'application/json');
        res.end(JSON.stringify(list, null, 2));
      })
      .get('/admin', async function(res) {
        res.onAborted(() => {});

        try {
          res.end(await readFile(app.config.admin.htmlPath));
        } catch (e) {
          res.end(`internal error: ${e}`);
        }
      })
      .any('*', res => {
        res.writeStatus('404 Not Found').end('');
      });
  }

  async run(): Promise<void> {
    try {
      await new Promise((resolve, reject) => {
        this.uws.listen(this.app.config.host, this.app.config.port, listenSocket => {
          if (!listenSocket) {
            return reject(listenSocket);
          }

          this.log.info(
            `WS/HTTP server listening on ${this.app.config.host}:${this.app.config.port}.`
          );

          return resolve();
        });
      });
    } catch (err) {
      this.log.error(err);

      process.exit(1);
    }
  }

  protected static decodeIPv4(rawIp: ArrayBuffer): IPv4 {
    return new Uint8Array(rawIp).join('.');
  }
}
