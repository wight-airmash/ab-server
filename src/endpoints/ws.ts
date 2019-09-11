import uws from 'uWebSockets.js';
import {
  CONNECTIONS_STATUS,
  CONNECTIONS_IDLE_TIMEOUT_SEC,
  CONNECTIONS_MAX_PAYLOAD_BYTES,
  CONNECTIONS_PACKET_LOGIN_TIMEOUT_MS,
  CONNECTIONS_PLAYERS_TO_CONNECTIONS_MULTIPLIER,
} from '@/constants';
import GameServer from '@/core/server';
import {
  CONNECTIONS_BREAK,
  CONNECTIONS_CLOSED,
  TIMEOUT_LOGIN,
  CONNECTIONS_PACKET_RECEIVED,
  CONNECTIONS_UNBAN_IP,
  RESPONSE_PLAYER_BAN,
} from '@/events';
import { ConnectionMeta, PlayerConnection, IPv4 } from '@/types';
import Logger from '@/logger';

export default class WsEndpoint {
  protected uws: uws.TemplatedApp;

  protected app: GameServer;

  protected log: Logger;

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

          if (this.app.storage.connectionByIPList.has(ws.meta.ip)) {
            connectionsCounter = this.app.storage.connectionByIPList.get(ws.meta.ip) + 1;
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
            this.app.storage.connectionByIPList.set(ws.meta.ip, connectionsCounter);

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

          const connectionsCounter = this.app.storage.connectionByIPList.get(ws.meta.ip) - 1;

          if (connectionsCounter === 0) {
            this.app.storage.connectionByIPList.delete(ws.meta.ip);
          } else {
            this.app.storage.connectionByIPList.set(ws.meta.ip, connectionsCounter);
          }

          this.app.events.emit(CONNECTIONS_CLOSED, ws.meta.id);
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
