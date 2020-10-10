import { GAME_TYPES } from '@airbattle/protocol';
import { Collisions } from 'collisions';
import { Netmask } from 'netmask';
import EventEmitter from 'eventemitter3';
import maxmind, { CountryResponse, Reader } from 'maxmind';
import { GameServerConfigInterface } from '../config';
import {
  POWERUPS_DEFAULT_SPAWN_CHANCE,
  SERVER_LOOP_INTERVAL_NS,
  SERVER_SCALE_FACTOR_VALID_VALUES,
  UPGRADES_DEFAULT_DROP_CHANCE,
  POWERUPS_DEFAULT_SPAWN_LIMIT,
} from '../constants';
import WsEndpoint from '../endpoints/ws';
import {
  CHAT_EMIT_DELAYED_EVENTS,
  CHAT_MUTE_EMIT_DELAYED_EVENTS,
  COLLISIONS_DETECT,
  PLAYERS_EMIT_CHANNEL_CONNECT,
  PLAYERS_EMIT_CHANNEL_DISCONNECT,
  PLAYERS_EMIT_CHANNEL_FLAG,
  PLAYERS_EMIT_CHANNEL_RESPAWN,
  PLAYERS_RANKINGS_SORT,
  PLAYERS_UPDATE,
  PROJECTILES_UPDATE,
  SERVER_FRAMES_SKIPPED,
  SPECTATE_EMIT_CHANNEL_EVENTS,
  TIMELINE_BEFORE_GAME_START,
  TIMELINE_GAME_START,
  TIMELINE_LOOP_END,
  TIMELINE_LOOP_START,
  TIMELINE_LOOP_TICK,
  WORKERS_LOG_DEBUG,
  WORKERS_LOG_ERROR,
  WORKERS_LOG_FATAL,
  WORKERS_LOG_INFO,
  WORKERS_LOG_WARN,
} from '../events';
import {
  CHANNEL_CHAT,
  CHANNEL_CONNECT_PLAYER,
  CHANNEL_DEFAULT,
  CHANNEL_DISCONNECT_PLAYER,
  CHANNEL_MUTE,
  CHANNEL_PLAYERS_STATS,
  CHANNEL_RESPAWN_PLAYER,
  CHANNEL_SPECTATE,
  CHANNEL_UPDATE_HORIZON,
  CHANNEL_UPDATE_PLAYER_FLAG,
} from '../events/channels';
import Logger from '../logger';
import metrics, { Metrics } from '../logger/metrics';
import BTRGameManifest from '../modes/btr/manifest';
import CTFGameManifest from '../modes/ctf/manifest';
import FFAGameManifest from '../modes/ffa/manifest';
import { Channels } from '../server/channels';
import Helpers from '../server/helpers';
import GameManifest from '../server/mainfest';
import { GameStorage } from '../server/storage';
import { System } from '../server/system';
import { GameServerBootstrapInterface } from '../types';
import GameTicker from './ticker';

/**
 * Game server bootstrap.
 */
export default class GameServerBootstrap implements GameServerBootstrapInterface {
  /**
   * Collision detector.
   */
  public detector: Collisions;

  /**
   * Delayed events channels.
   */
  public channels: Channels;

  /**
   * EventEmitter for messaging throughout the game.
   */
  public events: EventEmitter;

  /**
   * "Global" functions with an access to the app.
   */
  public helpers: Helpers;

  /**
   * All currently running systems.
   */
  public systems: Set<System> = new Set();

  /**
   * Game server data storage.
   */
  public storage: GameStorage;

  /**
   * Reference to the log.
   */
  public log: Logger;

  /**
   * Reference to the config.
   */
  public config: GameServerConfigInterface;

  /**
   * Performance metrics.
   */
  public metrics: Metrics;

  /**
   * WS and HTTP endpoint.
   */
  public ws: WsEndpoint;

  /**
   * Game mode config.
   */
  public gameMode: GameManifest;

  /**
   * Geo-coder to get players country codes.
   */
  public geocoder: Reader<CountryResponse>;

  /**
   * Game main loop ticker.
   */
  public ticker: GameTicker;

  private frame: number;

  private ff: number;

  private time: number;

  private skips: number;

  constructor({ config, log }: { config: GameServerConfigInterface; log: Logger }) {
    this.config = config;
    this.log = log;

    this.bindExitListeners();
    this.setupEvents();

    this.metrics = metrics;
    this.storage = new GameStorage();

    this.config.bots.ipList.forEach(ip => {
      // allow subnet blocks to be provided and expanded
      // this allows for a subnet like 192.168.100.0/26 to be expanded to 64 ip addresses, 
      // without requiring the 64 ips to be provided as an enumerated list in an env variable.
      // This should perform fine even if a large subnet is provided. If that use case were
      // relevant the Netmask library could be used to combine subnets and perform efficient
      // lookups.
      var block = new Netmask(ip)
      block.forEach((ip, long, index) => {
        this.storage.ipBotList.add(ip);
      })
    });
    if (this.storage.ipBotList.size > 1048576) {
      this.log.warn('Bot IP list is getting long. %o records. This may impact performance!', this.storage.ipBotList.size)
    }

    this.helpers = new Helpers({ app: this });
    this.ticker = new GameTicker({ app: this, interval: SERVER_LOOP_INTERVAL_NS });

    /**
     * Game type validation.
     */
    if (this.config.server.typeId === GAME_TYPES.FFA) {
      this.gameMode = new FFAGameManifest({ app: this });
    } else if (this.config.server.typeId === GAME_TYPES.CTF) {
      this.gameMode = new CTFGameManifest({ app: this });
    } else if (this.config.server.typeId === GAME_TYPES.BTR) {
      this.gameMode = new BTRGameManifest({ app: this });
    } else {
      this.log.fatal(`Unsupported game type ${this.config.server.type}!`);

      process.exit(1);
    }

    /**
     * Scale factor validation.
     */
    if (!SERVER_SCALE_FACTOR_VALID_VALUES.includes(this.config.server.scaleFactor)) {
      this.log.fatal('Unsupported scale factor value!');

      process.exit(1);
    }

    /**
     * Superuser password validation.
     */
    if (this.config.suPassword === '') {
      this.log.fatal("Superuser password can't be empty (env:SU_PASSWORD).");

      process.exit(1);
    }

    /**
     * Packet limits validation.
     */
    if (
      this.config.connections.packetLimits.any <= this.config.connections.packetLimits.key ||
      this.config.connections.packetLimits.any <= this.config.connections.packetLimits.chat
    ) {
      this.log.fatal(
        'PACKETS_LIMIT_ANY must be greater than PACKETS_LIMIT_KEY and PACKETS_LIMIT_CHAT.',
        this.config.connections.packetLimits
      );

      process.exit(1);
    }

    /**
     * Init default values.
     */
    if (typeof process.env.UPGRADES_DROP_MIN_CHANCE === 'undefined') {
      this.config.upgrades.minChance = UPGRADES_DEFAULT_DROP_CHANCE[this.config.server.typeId].min;
    }

    if (typeof process.env.UPGRADES_DROP_MAX_CHANCE === 'undefined') {
      this.config.upgrades.maxChance = UPGRADES_DEFAULT_DROP_CHANCE[this.config.server.typeId].max;
    }

    this.log.debug(
      `Upgrades drop chance: [${this.config.upgrades.minChance}, ${this.config.upgrades.maxChance}]`
    );

    if (typeof process.env.POWERUPS_SPAWN_CHANCE === 'undefined') {
      this.config.powerups.chance = POWERUPS_DEFAULT_SPAWN_CHANCE[this.config.server.typeId];
    }

    if (typeof process.env.POWERUPS_SPAWN_LIMIT === 'undefined') {
      this.config.powerups.limit = POWERUPS_DEFAULT_SPAWN_LIMIT[this.config.server.typeId];
    }

    this.log.debug('Powerups spawn: %o', this.config.powerups);
  }

  /**
   * Register system event listeners.
   *
   * @param system
   */
  startSystem(system: System): void {
    if (
      !Array.from(this.systems)
        .map(s => s.constructor)
        .includes(system.constructor)
    ) {
      this.systems.add(system);

      this.log.debug(`System ${system.constructor.name} added.`);

      Object.keys(system.listeners).forEach(listener => {
        this.events.on(listener, system.listeners[listener], system);
      });
    }
  }

  /**
   * Unregister system event listeners.
   * In case you need to completely rewrite the base system.
   *
   * @param system
   */
  stopSystem(system: System): void {
    this.systems.delete(system);

    Object.keys(system.listeners).forEach(listener => {
      this.events.removeListener(listener, system.listeners[listener], system);
    });

    this.log.debug(`System ${system.constructor.name} removed.`);
  }

  /**
   * Init game server.
   */
  async init(): Promise<void> {
    await this.initEndpoints();
    await this.initGeoCoder();
  }

  /**
   * Run game server.
   */
  start(): void {
    /**
     * Prepare hitboxes cache, add built-in objects like mountains,
     * predefined infernos/shields etc.
     */
    this.events.emit(TIMELINE_BEFORE_GAME_START);

    this.storage.gameEntity.start = Date.now();

    /**
     * Event for match starting (ctf and btr).
     */
    this.events.emit(TIMELINE_GAME_START);

    this.ticker.start(this.mainLoop, this);

    this.log.info('Game server is running.');
  }

  stop(): void {
    this.ticker.stop();
    this.ws.stop();
  }

  /**
   * Server main loop emitting events for all subsystems.
   */
  mainLoop(frame: number, ff: number, time: number, skips: number): void {
    this.frame = frame;
    this.ff = ff;
    this.time = time;
    this.skips = skips;

    if (skips !== 0) {
      this.emitLoopEventsGroup(SERVER_FRAMES_SKIPPED);
    }

    this.emitLoopEventsGroup(TIMELINE_LOOP_START);
    this.emitLoopEventsGroup(PLAYERS_EMIT_CHANNEL_DISCONNECT);
    this.emitLoopEventsGroup(TIMELINE_LOOP_TICK);
    this.emitLoopEventsGroup(PROJECTILES_UPDATE);
    this.emitLoopEventsGroup(PLAYERS_UPDATE);
    this.emitLoopEventsGroup(PLAYERS_EMIT_CHANNEL_RESPAWN);
    this.emitLoopEventsGroup(PLAYERS_EMIT_CHANNEL_CONNECT);
    this.emitLoopEventsGroup(COLLISIONS_DETECT);
    this.emitLoopEventsGroup(PLAYERS_RANKINGS_SORT);
    this.emitLoopEventsGroup(PLAYERS_EMIT_CHANNEL_FLAG);
    this.emitLoopEventsGroup(CHAT_MUTE_EMIT_DELAYED_EVENTS);
    this.emitLoopEventsGroup(CHAT_EMIT_DELAYED_EVENTS);
    this.emitLoopEventsGroup(SPECTATE_EMIT_CHANNEL_EVENTS);
    this.emitLoopEventsGroup(TIMELINE_LOOP_END);
  }

  private setupEvents(): void {
    this.events = new EventEmitter();

    this.channels = new Channels(
      { eventEmitter: this.events, log: this.log },
      CHANNEL_CHAT,
      CHANNEL_CONNECT_PLAYER,
      CHANNEL_DEFAULT,
      CHANNEL_DISCONNECT_PLAYER,
      CHANNEL_MUTE,
      CHANNEL_PLAYERS_STATS,
      CHANNEL_RESPAWN_PLAYER,
      CHANNEL_SPECTATE,
      CHANNEL_UPDATE_HORIZON,
      CHANNEL_UPDATE_PLAYER_FLAG
    );

    this.events.on(WORKERS_LOG_DEBUG, this.log.debug, this.log);
    this.events.on(WORKERS_LOG_ERROR, this.log.error, this.log);
    this.events.on(WORKERS_LOG_FATAL, this.log.fatal, this.log);
    this.events.on(WORKERS_LOG_INFO, this.log.info, this.log);
    this.events.on(WORKERS_LOG_WARN, this.log.warn, this.log);
  }

  private async initEndpoints(): Promise<void> {
    this.ws = new WsEndpoint({
      app: this,
    });

    await this.ws.start();
  }

  private async initGeoCoder(): Promise<void> {
    this.geocoder = await maxmind.open<CountryResponse>(this.config.geoBasePath);
  }

  private bindExitListeners(): void {
    process.on('beforeExit', () => {
      this.log.processfinalHandlers(null, 'beforeExit');
    });

    process.on('exit', () => {
      this.log.processfinalHandlers(null, 'exit');
      this.stop();
    });

    process.on('uncaughtException', (err): void => {
      this.log.processfinalHandlers(err, 'uncaughtException');
      this.stop();
    });

    process.on('SIGINT', () => {
      this.log.processfinalHandlers(null, 'SIGINT');
      this.stop();
    });

    process.on('SIGQUIT', () => {
      this.log.processfinalHandlers(null, 'SIGQUIT');
      this.stop();
    });

    process.on('SIGTERM', () => {
      this.log.processfinalHandlers(null, 'SIGTERM');
      this.stop();
    });
  }

  private emitLoopEventsGroup(event: string): void {
    try {
      this.events.emit(event, this.frame, this.ff, this.time, this.skips);
    } catch (err) {
      this.log.error('Dispatching %s: %o', event, { error: err.stack });
    }
  }
}
