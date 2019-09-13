import { GAME_TYPES } from '@airbattle/protocol';
import { Collisions } from 'collisions';
import EventEmitter from 'eventemitter3';
import maxmind, { CountryResponse, Reader } from 'maxmind';
import { GameServerConfigInterface } from '@/config';
import {
  POWERUPS_DEFAULT_SPAWN_CHANCE,
  SERVER_LOOP_INTERVAL_NS,
  SERVER_SCALE_FACTOR_VALID_VALUES,
  UPGRADES_DEFAULT_DROP_CHANCE,
} from '@/constants';
import GameTicker from '@/core/ticker';
import WsEndpoint from '@/endpoints/ws';
import {
  CHAT_EMIT_DELAYED_EVENTS,
  CHAT_MUTE_EMIT_DELAYED_EVENTS,
  COLLISIONS_DETECT,
  PLAYERS_EMIT_CHANNEL_CONNECT,
  PLAYERS_EMIT_CHANNEL_DISCONNECT,
  PLAYERS_EMIT_CHANNEL_FLAG,
  PLAYERS_EMIT_CHANNEL_RESPAWN,
  PLAYERS_UPDATE,
  PROJECTILES_UPDATE,
  SERVER_FRAMES_SKIPPED,
  SPECTATE_EMIT_CHANNEL_EVENTS,
  TIMELINE_BEFORE_GAME_START,
  TIMELINE_GAME_START,
  TIMELINE_LOOP_END,
  TIMELINE_LOOP_START,
  TIMELINE_LOOP_TICK,
} from '@/events';
import Logger from '@/logger';
import metrics, { Metrics } from '@/logger/metrics';
import {
  CHANNEL_CHAT,
  CHANNEL_CONNECT_PLAYER,
  CHANNEL_DEFAULT,
  CHANNEL_DISCONNECT_PLAYER,
  CHANNEL_RESPAWN_PLAYER,
  CHANNEL_SPECTATE,
  CHANNEL_UPDATE_HORIZON,
  CHANNEL_UPDATE_PLAYER_FLAG,
  CHANNEL_VOTE_MUTE,
} from '@/server/channels';
import { Channels } from '@/server/channels/channels';
import { Helpers } from '@/server/helpers';
import { GameManifest } from '@/server/manifest';
import CTFGameManifest from '@/server/modes/ctf/manifest';
import FFAGameManifest from '@/server/modes/ffa/manifest';
import { GameStorage } from '@/server/storage';
import { System } from '@/server/system';
import { LoopParams } from './loop-params';

/**
 * Game server bootstrap.
 */
export default class GameServer {
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

  constructor({ config, log }: { config: GameServerConfigInterface; log: Logger }) {
    this.config = config;
    this.log = log;

    this.bindExitListeners();

    this.metrics = metrics;
    this.events = new EventEmitter();
    this.channels = new Channels(
      { eventEmitter: this.events, log: this.log },
      CHANNEL_DEFAULT,
      CHANNEL_CONNECT_PLAYER,
      CHANNEL_DISCONNECT_PLAYER,
      CHANNEL_RESPAWN_PLAYER,
      CHANNEL_SPECTATE,
      CHANNEL_CHAT,
      CHANNEL_UPDATE_HORIZON,
      CHANNEL_UPDATE_PLAYER_FLAG,
      CHANNEL_VOTE_MUTE
    );
    this.storage = new GameStorage();

    this.config.botsIP.forEach(ip => {
      this.storage.ipWhiteList.add(ip);
    });

    this.log.debug('Loaded', [...this.storage.ipWhiteList]);

    this.helpers = new Helpers({ app: this });
    this.ticker = new GameTicker({ app: this, interval: SERVER_LOOP_INTERVAL_NS });

    /**
     * Game type validation.
     */
    if (this.config.server.typeId === GAME_TYPES.FFA) {
      this.gameMode = new FFAGameManifest({ app: this });
    } else if (this.config.server.typeId === GAME_TYPES.CTF) {
      this.gameMode = new CTFGameManifest({ app: this });
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
     * Init default values.
     */
    if (typeof process.env.UPGRADES_DROP_MIN_CHANCE === 'undefined') {
      this.config.upgradesDropMinChance =
        UPGRADES_DEFAULT_DROP_CHANCE[this.config.server.typeId].min;
    }

    if (typeof process.env.UPGRADES_DROP_MAX_CHANCE === 'undefined') {
      this.config.upgradesDropMaxChance =
        UPGRADES_DEFAULT_DROP_CHANCE[this.config.server.typeId].max;
    }

    this.log.debug(
      `Upgrades drop chance: [${this.config.upgradesDropMinChance}, ${this.config.upgradesDropMaxChance}]`
    );

    if (typeof process.env.POWERUPS_SPAWN_CHANCE === 'undefined') {
      this.config.powerupSpawnChance = POWERUPS_DEFAULT_SPAWN_CHANCE[this.config.server.typeId];
    }

    this.log.debug(`Powerups spawn chance: ${this.config.powerupSpawnChance}`);
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
  }

  protected async initEndpoints(): Promise<void> {
    this.ws = new WsEndpoint({
      app: this,
    });

    await this.ws.run();
  }

  protected async initGeoCoder(): Promise<void> {
    this.geocoder = await maxmind.open<CountryResponse>(this.config.geoBasePath);
  }

  protected bindExitListeners(): void {
    process.on('beforeExit', () => {
      this.log.processfinalHandlers(null, 'beforeExit');
    });

    process.on('exit', () => {
      this.log.processfinalHandlers(null, 'exit');
    });

    process.on('uncaughtException', (err): void => {
      this.log.processfinalHandlers(err, 'uncaughtException');
    });

    process.on('SIGINT', () => {
      this.log.processfinalHandlers(null, 'SIGINT');
    });

    process.on('SIGQUIT', () => {
      this.log.processfinalHandlers(null, 'SIGQUIT');
    });

    process.on('SIGTERM', () => {
      this.log.processfinalHandlers(null, 'SIGTERM');
    });
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
  run(): void {
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

    this.ticker.start(params => this.mainLoop(params));

    this.log.info('Game server is running.');
  }

  /**
   * Server main loop emitting events for all subsystems.
   * @param params the params as sent by the ticker with information about timing
   */
  private mainLoop(params: LoopParams): void {
    this.events.emit(
      TIMELINE_LOOP_START,
      params.frame,
      params.frameFactor,
      params.timeFromStart,
      params.skippedFrames
    );

    try {
      this.events.emit(
        PLAYERS_EMIT_CHANNEL_DISCONNECT,
        params.frame,
        params.frameFactor,
        params.timeFromStart,
        params.skippedFrames
      );
    } catch (err) {
      this.log.error('Error while dispatching PLAYERS_EMIT_CHANNEL_DISCONNECT', err.stack);
    }

    if (params.skippedFrames !== 0) {
      try {
        this.events.emit(
          SERVER_FRAMES_SKIPPED,
          params.frame,
          params.frameFactor,
          params.timeFromStart,
          params.skippedFrames
        );
      } catch (err) {
        this.log.error('Error while dispatching SERVER_FRAMES_SKIPPED', err.stack);
      }
    }

    try {
      this.events.emit(
        TIMELINE_LOOP_TICK,
        params.frame,
        params.frameFactor,
        params.timeFromStart,
        params.skippedFrames
      );
    } catch (err) {
      this.log.error('Error while dispatching TIMELINE_LOOP_TICK', err.stack);
    }

    try {
      this.events.emit(
        PROJECTILES_UPDATE,
        params.frame,
        params.frameFactor,
        params.timeFromStart,
        params.skippedFrames
      );
    } catch (err) {
      this.log.error('Error while dispatching PROJECTILES_UPDATE', err.stack);
    }

    try {
      this.events.emit(
        PLAYERS_UPDATE,
        params.frame,
        params.frameFactor,
        params.timeFromStart,
        params.skippedFrames
      );
    } catch (err) {
      this.log.error('Error while dispatching PLAYERS_UPDATE', err.stack);
    }

    try {
      this.events.emit(
        PLAYERS_EMIT_CHANNEL_RESPAWN,
        params.frame,
        params.frameFactor,
        params.timeFromStart,
        params.skippedFrames
      );
    } catch (err) {
      this.log.error('Error while dispatching PLAYERS_EMIT_CHANNEL_RESPAWN', err.stack);
    }

    try {
      this.events.emit(
        PLAYERS_EMIT_CHANNEL_CONNECT,
        params.frame,
        params.frameFactor,
        params.timeFromStart,
        params.skippedFrames
      );
    } catch (err) {
      this.log.error('Error while dispatching PLAYERS_EMIT_CHANNEL_CONNECT', err.stack);
    }

    try {
      this.events.emit(
        COLLISIONS_DETECT,
        params.frame,
        params.frameFactor,
        params.timeFromStart,
        params.skippedFrames
      );
    } catch (err) {
      this.log.error('Error while dispatching COLLISIONS_DETECT', err.stack);
    }

    try {
      this.events.emit(
        PLAYERS_EMIT_CHANNEL_FLAG,
        params.frame,
        params.frameFactor,
        params.timeFromStart,
        params.skippedFrames
      );
    } catch (err) {
      this.log.error('Error while dispatching PLAYERS_EMIT_CHANNEL_FLAG', err.stack);
    }

    try {
      this.events.emit(
        CHAT_MUTE_EMIT_DELAYED_EVENTS,
        params.frame,
        params.frameFactor,
        params.timeFromStart,
        params.skippedFrames
      );
    } catch (err) {
      this.log.error('Error while dispatching CHAT_MUTE_EMIT_DELAYED_EVENTS', err.stack);
    }

    try {
      this.events.emit(
        CHAT_EMIT_DELAYED_EVENTS,
        params.frame,
        params.frameFactor,
        params.timeFromStart,
        params.skippedFrames
      );
    } catch (err) {
      this.log.error('Error while dispatching CHAT_EMIT_DELAYED_EVENTS', err.stack);
    }

    try {
      this.events.emit(
        SPECTATE_EMIT_CHANNEL_EVENTS,
        params.frame,
        params.frameFactor,
        params.timeFromStart,
        params.skippedFrames
      );
    } catch (err) {
      this.log.error('Error while dispatching SPECTATE_EMIT_CHANNEL_EVENTS', err.stack);
    }

    this.events.emit(
      TIMELINE_LOOP_END,
      params.frame,
      params.frameFactor,
      params.timeFromStart,
      params.skippedFrames
    );
  }
}
