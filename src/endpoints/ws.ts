import fs from 'fs';
import querystring from 'querystring';
import util from 'util';
import uws from 'uWebSockets.js';
import {
  CHAT_SUPERUSER_MUTE_TIME_MS,
  CONNECTIONS_IDLE_TIMEOUT_SEC,
  CONNECTIONS_MAX_PAYLOAD_BYTES,
  CONNECTIONS_PACKET_LOGIN_TIMEOUT_MS,
  CONNECTIONS_PLAYERS_TO_CONNECTIONS_MULTIPLIER,
  CONNECTIONS_STATUS,
  CONNECTIONS_SUPERUSER_BAN_MS,
} from '@/constants';
import GameServer from '@/core/server';
import {
  CHAT_MUTE_BY_IP,
  CHAT_UNMUTE_BY_IP,
  CONNECTIONS_BAN_IP,
  CONNECTIONS_BREAK,
  CONNECTIONS_CLOSED,
  CONNECTIONS_PACKET_RECEIVED,
  CONNECTIONS_UNBAN_IP,
  CTF_REMOVE_PLAYER_FROM_LEADER,
  ERRORS_PACKET_FLOODING_DETECTED,
  PLAYERS_KICK,
  RESPONSE_PLAYER_BAN,
  TIMEOUT_LOGIN,
} from '@/events';
import Logger from '@/logger';
import { ConnectionMeta, IPv4, PlayerConnection } from '@/types';

const readFile = util.promisify(fs.readFile);

const readRequest = (res: uws.HttpResponse, cb: Function, err: () => void): void => {
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
};

export default class WsEndpoint {
  protected uws: uws.TemplatedApp;

  protected app: GameServer;

  protected log: Logger;

  protected moderatorActions: Array<string> = [];

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

        open: (connection: PlayerConnection, req) => {
          const connectionId = this.app.helpers.createConnectionId();
          const now = Date.now();

          this.app.storage.connectionList.set(connectionId, connection);

          connection.meta = {
            id: connectionId,
            ip: WsEndpoint.decodeIPv4(connection.getRemoteAddress()),
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
            connection.meta.ip = req.getHeader('x-forwarded-for');
          } else if (req.getHeader('x-real-ip') !== '') {
            connection.meta.ip = req.getHeader('x-real-ip');
          }

          this.log.debug(
            `Open connection id${connectionId}, ${req.getMethod()}, ${connection.meta.ip}`
          );

          /**
           * Detect bots.
           */
          if (
            this.app.config.whitelist === false ||
            this.app.storage.ipWhiteList.has(connection.meta.ip)
          ) {
            connection.meta.isBot = true;

            if (this.app.config.whitelist === false) {
              this.log.debug(
                `Connection id${connectionId} IP ${connection.meta.ip} is a bot (whitelist is disabled).`
              );
            } else {
              this.log.debug(
                `Connection id${connectionId} IP ${connection.meta.ip} is in a white list (bot).`
              );
            }
          }

          req.forEach((key, value) => {
            connection.meta.headers[key] = value;
            this.log.debug(`Connection id${connectionId} header: '${key}': '${value}'`);
          });

          /**
           * Ban check.
           */
          if (this.app.storage.ipBanList.has(connection.meta.ip)) {
            const ipBan = this.app.storage.ipBanList.get(connection.meta.ip);

            if (ipBan.expire > connection.meta.createdAt) {
              this.log.info('IP is banned. Connection refused.', {
                ip: connection.meta.ip,
                connection: connectionId,
              });

              this.app.events.emit(
                RESPONSE_PLAYER_BAN,
                connectionId,
                ipBan.reason === ERRORS_PACKET_FLOODING_DETECTED
              );

              setTimeout(() => {
                this.app.events.emit(CONNECTIONS_BREAK, connectionId);
              }, 100);

              return;
            }

            this.app.events.emit(CONNECTIONS_UNBAN_IP, connection.meta.ip);
          }

          /**
           * Max IP connections check.
           */
          let connectionsCounter = 1;

          if (this.app.storage.connectionByIPCounter.has(connection.meta.ip)) {
            connectionsCounter = this.app.storage.connectionByIPCounter.get(connection.meta.ip) + 1;
          }

          if (
            connectionsCounter >
              this.app.config.maxPlayersPerIP * CONNECTIONS_PLAYERS_TO_CONNECTIONS_MULTIPLIER &&
            !this.app.storage.ipWhiteList.has(connection.meta.ip)
          ) {
            this.log.info('Max connections per IP reached. Connection refused.', {
              ip: connection.meta.ip,
              connection: connectionId,
            });

            this.app.events.emit(CONNECTIONS_BREAK, connectionId);
          } else {
            this.app.storage.connectionByIPCounter.set(connection.meta.ip, connectionsCounter);

            connection.meta.status = CONNECTIONS_STATUS.ESTABLISHED;

            /**
             * Awaiting for Login package.
             */
            connection.meta.timeouts.login = setTimeout(() => {
              this.app.events.emit(TIMEOUT_LOGIN, connectionId);
            }, CONNECTIONS_PACKET_LOGIN_TIMEOUT_MS);
          }
        },

        message: (connection: PlayerConnection, message, isBinary) => {
          if (isBinary === true) {
            try {
              this.app.events.emit(CONNECTIONS_PACKET_RECEIVED, message, connection.meta.id);
            } catch (err) {
              this.log.error(`Connection id${connection.meta.id} error.`, err.stack);
            }
          } else {
            this.log.debug(`Connection id${connection.meta.id} message isn't binary.`);
            this.app.events.emit(CONNECTIONS_BREAK, connection.meta.id);
          }
        },

        drain: connection => {
          this.log.debug(`WebSocket backpressure: ${connection.getBufferedAmount()}`);
        },

        close: (connection: PlayerConnection, code) => {
          this.log.debug(`Connection id${connection.meta.id} was closed, code ${code}`);

          const connectionsCounter =
            this.app.storage.connectionByIPCounter.get(connection.meta.ip) - 1;

          if (connectionsCounter === 0) {
            this.app.storage.connectionByIPCounter.delete(connection.meta.ip);
          } else {
            this.app.storage.connectionByIPCounter.set(connection.meta.ip, connectionsCounter);
          }

          try {
            this.app.events.emit(CONNECTIONS_CLOSED, connection.meta.id);
          } catch (err) {
            this.log.error(`Connection id${connection.meta.id} closing error.`, err.stack);
          }
        },
      })

      .get('/ping', res => {
        res.end('{"pong":1}');
      })

      .get('/', res => {
        res.end(`{"players":${this.app.storage.playerList.size}}`);
      })

      .any('*', res => {
        res.writeStatus('404 Not Found').end('');
      });

    if (this.app.config.admin.active === true) {
      this.uws
        .get(`/${this.app.config.admin.route}/server`, res => {
          res.writeHeader('Content-type', 'application/json');
          res.end(`{"type":${this.app.config.server.typeId}}`);
        })

        .get(`/${this.app.config.admin.route}/actions`, res => {
          res.writeHeader('Content-type', 'application/json');
          res.end(`[${this.moderatorActions.join(',\n')}]`);
        })

        .post(`/${this.app.config.admin.route}/actions`, res => {
          readRequest(
            res,
            (requestData: string) => {
              this.onActionsPost(res, requestData);
            },
            () => {
              this.log.error('failed to parse /actions POST');
            }
          );
        })

        .get(`/${this.app.config.admin.route}/players`, res => {
          const now = Date.now();
          const list = [];

          this.app.storage.playerList.forEach(player =>
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
              isMuted: player.times.unmuteTime > now,
              isBot: this.app.storage.botIdList.has(player.id.current),
            })
          );

          res.writeHeader('Content-type', 'application/json');
          res.end(JSON.stringify(list, null, 2));
        })

        .get(`/${this.app.config.admin.route}/`, async res => {
          res.onAborted(() => {
            // Do nothing.
          });

          try {
            res.writeHeader('Content-type', 'text/html');
            res.end(await readFile(app.config.admin.htmlPath));
          } catch (e) {
            res.end(`internal error: ${e}`);
          }
        });
    }
  }

  protected async getModeratorByPassword(password: string): Promise<string | boolean> {
    let file = null;

    try {
      file = await readFile(this.app.config.admin.passwordsPath);
    } catch (e) {
      this.log.error(`Cannot read mod passwords: ${e}`);

      return false;
    }

    const lines = file.toString().split('\n');

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const [name, test] = line.split(':');

      if (test === password) {
        return name;
      }
    }

    this.log.error('Failed mod password attempt');

    return false;
  }

  protected async onActionsPost(res: uws.HttpResponse, requestData: string): Promise<void> {
    const params = querystring.parse(requestData);
    const mod = await this.getModeratorByPassword(params.password as string);

    if (mod === false) {
      res.end('Invalid password');

      return;
    }

    const playerId = parseInt(params.playerid as string, 10);

    if (!this.app.storage.playerList.has(playerId)) {
      res.end('Invalid player');

      return;
    }

    const player = this.app.storage.playerList.get(playerId);

    switch (params.action) {
      case 'Mute':
        this.log.info(`Muting IP ${player.ip.current} (${playerId}: ${player.name.current})`);
        this.app.events.emit(CHAT_MUTE_BY_IP, player.ip.current, CHAT_SUPERUSER_MUTE_TIME_MS);
        break;

      case 'Unmute':
        this.log.info(`Unmuting IP: ${player.ip.current}`);
        this.app.events.emit(CHAT_UNMUTE_BY_IP, player.ip.current);
        break;

      case 'Dismiss':
        this.log.info(`Dismissing player ${playerId}`);
        this.app.events.emit(CTF_REMOVE_PLAYER_FROM_LEADER, playerId);
        break;

      case 'Kick':
        this.log.info(`Kicking player ${playerId}`);
        this.app.events.emit(PLAYERS_KICK, playerId);
        break;

      case 'Ban':
        this.log.info(`Banning IP: ${player.ip.current}`);
        this.app.events.emit(
          CONNECTIONS_BAN_IP,
          player.ip.current,
          CONNECTIONS_SUPERUSER_BAN_MS,
          `${mod}: ${params.reason}`
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
