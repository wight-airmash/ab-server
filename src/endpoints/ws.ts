import { existsSync } from 'fs';
import { marshalServerMessage, ProtocolPacket } from '@airbattle/protocol';
import EventEmitter from 'eventemitter3';
import uws, { DISABLED } from 'uWebSockets.js';
import { GameServerConfigInterface } from '../config';
import {
  CONNECTIONS_IDLE_TIMEOUT_SEC,
  CONNECTIONS_MAX_BACKPRESSURE,
  CONNECTIONS_MAX_PAYLOAD_BYTES,
  CONNECTIONS_PACKET_LOGIN_TIMEOUT_MS,
  CONNECTIONS_PLAYERS_TO_CONNECTIONS_MULTIPLIER,
  CONNECTIONS_STATUS,
  CONNECTIONS_WEBSOCKETS_COMPRESSOR,
  MAX_UINT32,
} from '../constants';
import GameServerBootstrap from '../core/bootstrap';
import {
  CONNECTIONS_CLOSE,
  CONNECTIONS_CLOSED,
  CONNECTIONS_PACKET_RECEIVED,
  CONNECTIONS_SEND_PACKETS,
  CONNECTIONS_UNBAN_IP,
  ERRORS_PACKET_FLOODING_DETECTED,
  RESPONSE_PLAYER_BAN,
  TIMEOUT_LOGIN,
  WS_WORKER_GET_PLAYER,
  WS_WORKER_GET_PLAYERS_LIST,
  WS_WORKER_GET_PLAYERS_LIST_RESPONSE,
  WS_WORKER_GET_PLAYER_RESPONSE,
} from '../events';
import Logger from '../logger';
import { GameStorage } from '../server/storage';
import { decodeIPv4 } from '../support/binary';
import {
  AdminActionPlayer,
  AdminPlayersListItem,
  ConnectionId,
  ConnectionMeta,
  Player,
  PlayerConnection,
  PlayerId,
  WorkerConnectionMeta,
} from '../types';
import Admin from './admin';
import ConnectionsStorage from './storage';

export default class WsEndpoint {
  private app: GameServerBootstrap;

  private log: Logger;

  private storage: GameStorage;

  private events: EventEmitter;

  private uws: uws.TemplatedApp;

  private wsStorage: ConnectionsStorage;

  private path: string;

  private config: GameServerConfigInterface;

  constructor({ app }) {
    this.app = app;
    this.log = this.app.log;
    this.config = this.app.config;
    this.storage = this.app.storage;
    this.events = this.app.events;
    this.wsStorage = new ConnectionsStorage();
    this.path = this.config.server.basePath;

    /**
     * Event handlers.
     */
    this.events.on(CONNECTIONS_CLOSE, this.closeConnection, this);

    this.events.on(CONNECTIONS_SEND_PACKETS, this.sendPackets, this);

    this.events.on(WS_WORKER_GET_PLAYER, this.getAdminPlayerById, this);
    this.events.on(WS_WORKER_GET_PLAYERS_LIST, this.getAdminPlayersList, this);

    /**
     * Setup endpoint.
     */
    if (this.config.server.tls) {
      const tlsConfig = {
        key_file_name: `${this.config.server.certs.path}/privkey.pem`, // eslint-disable-line
        cert_file_name: `${this.config.server.certs.path}/fullchain.pem`, // eslint-disable-line
        dh_params_file_name: `${this.config.server.certs.path}/dhparam.pem`, // eslint-disable-line
      };

      if (!existsSync(tlsConfig.dh_params_file_name)) {
        delete tlsConfig.dh_params_file_name;
      }

      this.uws = uws.SSLApp(tlsConfig);
    } else {
      this.uws = uws.App({});
    }

    this.bindWebsocketHandlers();
    this.bindHttpRoutes();
    new Admin(this.config, this.app).bindRoutes(this.uws);
  }

  /**
   * Collect the response data on `/admin/actions` POST request.
   */
  getAdminPlayerById(playerId: PlayerId): void {
    let actionPlayerData: AdminActionPlayer = null;

    if (this.storage.playerList.has(playerId)) {
      const player = this.storage.playerList.get(playerId);

      actionPlayerData = {
        id: player.id.current,
        name: player.name.current,
        ip: player.ip.current,
      };
    }

    this.app.events.emit(WS_WORKER_GET_PLAYER_RESPONSE, actionPlayerData);
  }

  /**
   * Collect the response data on `/admin/players` request.
   */
  getAdminPlayersList(): void {
    const now = Date.now();
    const list: AdminPlayersListItem[] = [];

    {
      const playersIterator = this.storage.playerList.values();
      let player: Player = playersIterator.next().value;

      while (player !== undefined) {
        list.push({
          id: player.id.current,
          name: player.name.current,
          captures: player.captures.current,
          isSpectate: player.spectate.isActive,
          kills: player.kills.current,
          deaths: player.deaths.current,
          score: player.score.current,
          lastMove: player.times.lastMove,
          ping: player.ping.current,
          flag: player.flag.current,
          isMuted: player.times.unmuteTime > now,
          isBot: player.bot.current,
        });

        player = playersIterator.next().value;
      }
    }

    this.app.events.emit(WS_WORKER_GET_PLAYERS_LIST_RESPONSE, list);
  }

  /**
   * Handle just opened connection.
   *
   * @param workerConnectionMeta
   */
  connectionOpened(workerConnectionMeta: WorkerConnectionMeta): void {
    const connectionMeta: ConnectionMeta = {
      id: workerConnectionMeta.id,
      ip: workerConnectionMeta.ip,
      isBackup: false,
      isMain: false,
      isSync: false,
      status: CONNECTIONS_STATUS.OPENED,
      headers: workerConnectionMeta.headers,
      isBot: false,
      playerId: null,
      teamId: null,
      userId: null,
      lastPacketAt: workerConnectionMeta.createdAt,
      createdAt: workerConnectionMeta.createdAt,

      lagging: {
        isActive: false,
        lastAt: 0,
        lastDuration: 0,
        detects: 0,
        packets: 0,
      },

      periodic: {
        ping: null,
      },

      timeouts: {
        login: null,
        ack: null,
        backup: null,
        pong: null,
        respawn: null,
        lagging: null,
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

      sync: {
        auth: {
          nonce: null,
          complete: false,
        },
        init: {
          complete: false,
        },
      },
    };

    const connectionId = connectionMeta.id;

    const connection = this.storage.connectionList
      .set(connectionId, connectionMeta)
      .get(connectionId);

    const { ip } = connection;

    this.log.info('okay now');

    /**
     * Detect bots.
     */
    if (this.config.bots.enabled && this.storage.ipBotList.has(ip)) {
      connection.isBot = true;
    }

    /**
     * Ban check.
     */
    if (this.storage.ipBanList.has(ip)) {
      const ipBan = this.storage.ipBanList.get(ip);

      if (ipBan.expire > connection.createdAt) {
        this.log.info('Connection refused. IP is banned: %o', {
          connectionId,
          ip,
        });

        this.events.emit(
          RESPONSE_PLAYER_BAN,
          connectionId,
          ipBan.reason === ERRORS_PACKET_FLOODING_DETECTED
        );

        setTimeout(() => {
          this.closeConnection(connectionId);
        }, 100);

        return;
      }

      this.events.emit(CONNECTIONS_UNBAN_IP, ip);
    }

    /**
     * Max IP connections check.
     */
    let connectionsCounter = 1;

    if (this.storage.connectionByIPCounter.has(ip)) {
      connectionsCounter = this.storage.connectionByIPCounter.get(ip) + 1;
    }

    if (
      !connection.isBot &&
      connectionsCounter >
        this.config.connections.maxPlayersPerIP * CONNECTIONS_PLAYERS_TO_CONNECTIONS_MULTIPLIER
    ) {
      this.log.info('Connection refused: max connections per IP reached: %o', {
        connectionId,
        ip,
      });

      this.closeConnection(connectionId);
    } else {
      this.storage.connectionByIPCounter.set(ip, connectionsCounter);
      connection.status = CONNECTIONS_STATUS.ESTABLISHED;
    }

    /**
     * Awaiting for Login packet.
     */
    connection.timeouts.login = setTimeout(() => {
      this.events.emit(TIMEOUT_LOGIN, connectionId);
    }, CONNECTIONS_PACKET_LOGIN_TIMEOUT_MS);
  }

  /**
   * Encode and pass binary packet to the worker to send it to the connection(s).
   *
   * Use `exceptions` array to prevent sending to some clients.
   * If `exceptions` array contains connection identifier,
   * this identifier must exist in `connectionId` array.
   *
   * Exceptions array mustn't contain any garbage.
   *
   * @param msg packet object
   * @param connectionId connectionId or array of unique connectionIds
   * @param exceptions array of unique connectionIds
   */
  sendPackets(
    msg: ProtocolPacket,
    connectionId: ConnectionId | ConnectionId[],
    exceptions: ConnectionId[] = null
  ): void {
    let packet: ArrayBuffer;
    let packetsAmount = 1;

    try {
      packet = marshalServerMessage(msg);
    } catch (err) {
      this.log.error('Message encoding error: %o', { error: err.stack });

      return;
    }

    if (Array.isArray(connectionId)) {
      packetsAmount = connectionId.length;

      if (exceptions !== null) {
        packetsAmount -= exceptions.length;
      }

      for (let index = 0; index < connectionId.length; index += 1) {
        if (exceptions === null || !exceptions.includes(connectionId[index])) {
          this.sendPacket(packet, connectionId[index]);
        }
      }
    } else {
      this.sendPacket(packet, connectionId);
    }

    this.app.metrics.packets.out += packetsAmount;
    this.app.metrics.transfer.outB += packet.byteLength * packetsAmount;

    if (this.app.metrics.collect === true) {
      this.app.metrics.sample.ppsOut += packetsAmount;
      this.app.metrics.sample.tOut += packet.byteLength * packetsAmount;
    }
  }

  /**
   * Run WS worker.
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.uws.listen(this.config.server.host, this.config.server.port, listenSocket => {
          if (!listenSocket) {
            reject();

            process.exit(1);
          }

          resolve();

          this.log.info('WS/HTTP server started: %o', {
            host: this.config.server.host,
            port: this.config.server.port,
            path: this.config.server.basePath,
            compression: this.config.server.compression,
            tls: this.config.server.tls,
          });
        });
      } catch (err) {
        this.log.error('WS/HTTP failed to start: %o', {
          host: this.config.server.host,
          port: this.config.server.port,
          path: this.config.server.basePath,
          compression: this.config.server.compression,
          tls: this.config.server.tls,
          error: err.stack,
        });

        reject();

        process.exit(1);
      }
    });
  }

  stop(): void {
    this.log.debug('WS stopped.');
    process.exit();
  }

  private sendPacket(packet: ArrayBuffer, connectionId: ConnectionId): void {
    try {
      if (!this.wsStorage.connectionList.has(connectionId)) {
        return;
      }

      const ws = this.wsStorage.connectionList.get(connectionId);

      if (ws.getBufferedAmount() !== 0) {
        this.log.info('Slow connection, buffer > 0: %o', {
          connectionId,
          bufferSize: ws.getBufferedAmount(),
        });

        if (ws.getBufferedAmount() > CONNECTIONS_MAX_BACKPRESSURE) {
          this.closeConnection(connectionId);
        }
      }

      const result = ws.send(packet, true, this.config.server.compression);

      if (!result) {
        this.log.debug('Packet sending failed: %o', {
          connectionId,
          bufferSize: ws.getBufferedAmount(),
          packerSize: packet.byteLength,
        });

        this.closeConnection(connectionId);
      }
    } catch (err) {
      this.log.error('Packet sending error: %o', {
        connectionId,
        packerSize: packet.byteLength,
        error: err.stack,
      });
    }
  }

  private closeConnection(connectionId: ConnectionId): void {
    try {
      if (!this.wsStorage.connectionList.has(connectionId)) {
        return;
      }

      const ws = this.wsStorage.connectionList.get(connectionId);

      ws.close();
    } catch (err) {
      this.log.error('Connection closing error: %o', { connectionId, error: err.stack });
    }
  }

  private bindWebsocketHandlers(): void {
    this.log.error('what the everliving fuck')
    this.uws.ws('*', {

      compression: this.config.server.compression ? CONNECTIONS_WEBSOCKETS_COMPRESSOR : DISABLED,
      maxPayloadLength: CONNECTIONS_MAX_PAYLOAD_BYTES,
      maxBackpressure: CONNECTIONS_MAX_BACKPRESSURE,
      idleTimeout: CONNECTIONS_IDLE_TIMEOUT_SEC,

      open: (connection: PlayerConnection, req) => {

        this.log.error('what the heck is even happening?', {});

        const connectionId = this.createConnectionId();
        const now = Date.now();
        const meta: WorkerConnectionMeta = {
          id: connectionId,
          ip: decodeIPv4(connection.getRemoteAddress()),
          headers: {},
          createdAt: now,
        };

        if (req.getHeader('x-forwarded-for') !== '') {
          meta.ip = req.getHeader('x-forwarded-for');
        } else if (req.getHeader('x-real-ip') !== '') {
          meta.ip = req.getHeader('x-real-ip');
        }

        connection.meta = meta;

        this.wsStorage.connectionList.set(connectionId, connection);

        req.forEach((title, value) => {
          meta.headers[title] = value;
        });

        this.log.debug('Connection opened: %o', {
          connectionId,
          ip: meta.ip,
          method: req.getMethod(),
          headers: meta.headers,
        });

        this.connectionOpened(meta);
      },

      message: (connection: PlayerConnection, message, isBinary) => {
        if (isBinary === true) {
          try {
            this.events.emit(CONNECTIONS_PACKET_RECEIVED, message, connection.meta.id);
          } catch (err) {
            this.log.error('Connection onMessage error: %o', {
              connectionId: connection.meta.id,
              error: err.stack,
            });
          }
        } else {
          this.log.debug("Connection onMessage isn't binary: %o", {
            connectionId: connection.meta.id,
          });

          this.closeConnection(connection.meta.id);
        }
      },

      close: (connection: PlayerConnection, code) => {
        const { id } = connection.meta;

        try {
          this.wsStorage.connectionList.delete(id);

          this.log.debug('Connection closed: %o', { connectionId: id, code });

          this.events.emit(CONNECTIONS_CLOSED, id);
        } catch (err) {
          this.log.error('Connection closing error: %o', { connectionId: id, error: err.stack });
        }
      },
    });
  }

  private bindHttpRoutes(): void {
    this.uws
      .get(`${this.path}/ping`, res => {
        res.writeHeader('Content-type', 'application/json').end('{"pong":1}');
      })

      .get(`${this.path}/`, res => {

        this.log.error('y tho');

        const gameModeResponse =
          this.storage.gameModeAPIResponse === '' ? '' : `,${this.storage.gameModeAPIResponse}`;

        res
          .writeHeader('Content-type', 'application/json')
          .end(
            `{"players":${this.storage.playerList.size},"bots":${this.storage.botIdList.size},"spectators":${this.storage.playerInSpecModeList.size}${gameModeResponse}}`
          );
      })

      .any(`${this.path}/*`, res => {
        res.writeStatus('404 Not Found').end('');
      });
  }

  private createConnectionId(): ConnectionId {
    while (this.wsStorage.connectionList.has(this.wsStorage.nextConnectionId)) {
      this.wsStorage.nextConnectionId += 1;

      if (this.wsStorage.nextConnectionId >= MAX_UINT32) {
        this.wsStorage.nextConnectionId = 1;
      }
    }

    if (this.wsStorage.nextConnectionId >= MAX_UINT32) {
      this.wsStorage.nextConnectionId = 1;
    }

    this.wsStorage.nextConnectionId += 1;

    return this.wsStorage.nextConnectionId - 1;
  }
}
