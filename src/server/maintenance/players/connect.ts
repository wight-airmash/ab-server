import { GAME_TYPES, PLAYER_LEVEL_UPDATE_TYPES } from '@airbattle/protocol';
import { Polygon } from 'collisions';
import {
  COLLISIONS_OBJECT_TYPES,
  CONNECTIONS_LOGIN_REQUEST_PER_TICKS_LIMIT,
  CONNECTIONS_PACKET_ACK_TIMEOUT_MS,
  CONNECTIONS_PACKET_BACKUP_TIMEOUT_MS,
  MAP_SIZE,
  PLAYERS_ALIVE_STATUSES,
  PLAYERS_SPAWN_SHIELD_DURATION_MS,
  SERVER_MAX_PLAYERS_LIMIT,
  SHIPS_SPECS,
  SHIPS_TYPES,
  UPGRADES_ACTION_TYPE,
  UPGRADES_START_AMOUNT,
} from '../../../constants';
import {
  BROADCAST_CHAT_SERVER_WHISPER,
  BROADCAST_PLAYER_LEVEL,
  BROADCAST_PLAYER_NEW,
  BROADCAST_SCORE_BOARD,
  CHAT_UNMUTE_BY_IP,
  CHAT_WELCOME,
  COLLISIONS_ADD_OBJECT,
  ERRORS_ALREADY_LOGGED_IN,
  PLAYERS_APPLY_SHIELD,
  PLAYERS_ASSIGN_ALIVE_STATUS,
  PLAYERS_ASSIGN_SPAWN_POSITION,
  PLAYERS_ASSIGN_TEAM,
  PLAYERS_CREATE,
  PLAYERS_CREATED,
  PLAYERS_EMIT_CHANNEL_CONNECT,
  PLAYERS_LIMIT_REACHED,
  PLAYERS_SET_SHIP_TYPE,
  PLAYERS_UPDATE_HORIZON,
  RESPONSE_LOGIN,
  RESPONSE_PLAYER_UPGRADE,
  RESPONSE_SCORE_UPDATE,
  RESPONSE_SEND_PING,
  RESPONSE_SERVER_PLAYER_CONNECT,
  TIMELINE_BEFORE_GAME_START,
  TIMEOUT_ACK,
  TIMEOUT_BACKUP,
  VIEWPORTS_CREATE,
} from '../../../events';
import { CHANNEL_CHAT, CHANNEL_CONNECT_PLAYER, CHANNEL_MUTE } from '../../../events/channels';
import { convertEarningsToLevel, getRandomInt } from '../../../support/numbers';
import { has } from '../../../support/objects';
import { generateBackupToken } from '../../../support/strings';
import { Player, User } from '../../../types';
import AliveStatus from '../../components/alive-status';
import Bot from '../../components/bot';
import Captures from '../../components/captures';
import Damage from '../../components/damage';
import Deaths from '../../components/deaths';
import Delayed from '../../components/delayed';
import Energy from '../../components/energy';
import Flag from '../../components/flag';
import Health from '../../components/health';
import HitCircles from '../../components/hit-circles';
import Hitbox from '../../components/hitbox';
import Horizon from '../../components/horizon';
import Inferno from '../../components/inferno-powerup';
import Ip from '../../components/ip';
import Keystate from '../../components/keystate';
import Kills from '../../components/kills';
import Level from '../../components/level';
import LifetimeStats from '../../components/lifetime-stats';
import Id from '../../components/mob-id';
import Ping from '../../components/ping';
import PlaneState from '../../components/plane-state';
import PlaneType from '../../components/plane-type';
import Name from '../../components/player-name';
import Position from '../../components/position';
import Recaptures from '../../components/recaptures';
import Repel from '../../components/repel';
import Rotation from '../../components/rotation';
import Say from '../../components/say';
import Score from '../../components/score';
import Shield from '../../components/shield-powerup';
import Spectate from '../../components/spectate';
import Stats from '../../components/stats';
import Su from '../../components/su';
import Team from '../../components/team';
import Times from '../../components/times';
import Token from '../../components/token';
import Upgrades from '../../components/upgrades';
import UserComponent from '../../components/user';
import Velocity from '../../components/velocity';
import Wins from '../../components/wins';
import Entity from '../../entity';
import { System } from '../../system';

export default class GamePlayersConnect extends System {
  private framesPassedSinceLogin = 0;

  constructor({ app }) {
    super({ app });

    this.listeners = {
      // Channels.
      [PLAYERS_EMIT_CHANNEL_CONNECT]: this.onEmitDelayedConnectEvents,

      // Events.
      [PLAYERS_CREATE]: this.onCreatePlayer,
      [TIMELINE_BEFORE_GAME_START]: this.createServerPlayer,
    };
  }

  /**
   * Connect only one player per tick.
   */
  onEmitDelayedConnectEvents(): void {
    this.framesPassedSinceLogin += 1;

    if (this.framesPassedSinceLogin < CONNECTIONS_LOGIN_REQUEST_PER_TICKS_LIMIT) {
      return;
    }

    this.channel(CHANNEL_CONNECT_PLAYER).emitFirstDelayed();
    this.framesPassedSinceLogin = 0;
  }

  /**
   * Create server bot.
   */
  createServerPlayer(): void {
    this.storage.serverPlayerId = this.helpers.createServiceMobId();
    this.storage.playerNameList.add(this.config.server.bot.name);
  }

  /**
   * Create player.
   */
  onCreatePlayer({ connectionId, name, flag, horizon, userId }): void {
    if (this.storage.playerList.size > SERVER_MAX_PLAYERS_LIMIT) {
      this.emit(PLAYERS_LIMIT_REACHED, connectionId);

      return;
    }

    if (!this.storage.connectionList.has(connectionId)) {
      return;
    }

    if (this.storage.users.online.has(userId)) {
      this.emit(ERRORS_ALREADY_LOGGED_IN, connectionId);

      return;
    }

    const mainConnection = this.storage.connectionList.get(connectionId);
    let uniqueName: string = name;

    if (
      mainConnection.isBot &&
      this.config.bots.prefix !== '' &&
      uniqueName.indexOf(this.config.bots.prefix) !== 0
    ) {
      uniqueName = `${this.config.bots.prefix}${name}`;
    }

    while (this.storage.playerNameList.has(uniqueName)) {
      uniqueName = `${name}#${getRandomInt(101, 999)}`;
    }

    const playerId = this.helpers.createMobId(uniqueName);

    /**
     * FFA and CTF have default type "Predator".
     */
    const shipType =
      this.config.server.typeId === GAME_TYPES.BTR
        ? this.storage.gameEntity.match.shipType
        : SHIPS_TYPES.PREDATOR;

    const player: Player = new Entity().attach(
      new AliveStatus(PLAYERS_ALIVE_STATUSES.DEFAULT),
      new Bot(mainConnection.isBot),
      new Captures(),
      new Damage(),
      new Deaths(),
      new Delayed(),
      new Energy(),
      new Flag(flag),
      new Health(),
      new Hitbox(),
      new HitCircles([...SHIPS_SPECS[shipType].collisions]),
      new Horizon(horizon.x, horizon.y),
      new Id(playerId),
      new Inferno(),
      new Ip(mainConnection.ip),
      new Keystate(),
      new Kills(),
      new Level(0),
      new Name(uniqueName, name),
      new Ping(),
      new PlaneState(),
      new PlaneType(shipType),
      new Position(0, 0),
      new Recaptures(),
      new Repel(),
      new Rotation(),
      new Say(),
      new Score(),
      new Shield(true, Date.now() + PLAYERS_SPAWN_SHIELD_DURATION_MS),
      new Spectate(),
      new Stats(),
      new Su(),
      new Team(playerId),
      new Times(),
      new Token(generateBackupToken()),
      new Upgrades(UPGRADES_START_AMOUNT),
      new Velocity(0, 0),
      new Wins()
    );

    /**
     * Retrieve or init user account stats.
     */
    if (this.config.accounts.active && userId.length > 0) {
      this.storage.users.online.add(userId);
      player.attach(new UserComponent(userId));

      let user: User;

      if (this.storage.users.list.has(userId)) {
        user = this.storage.users.list.get(userId);
      } else {
        user = new Entity().attach(new Id(userId), new LifetimeStats());

        this.storage.users.list.set(userId, user);
        this.storage.users.hasChanges = true;
      }

      player.level.current = convertEarningsToLevel(user.lifetimestats.earnings);
    }

    this.log.info('Player connected: %o', {
      playerId,
      name: uniqueName,
      ip: player.ip.current,
      connectionId,
    });

    /**
     * Player stats recovering after disconnection.
     * CTF only.
     */
    let isAssignTeamNeeded = true;
    let isRecovered = false;

    if (
      this.storage.playerRecoverList.has(playerId) &&
      this.config.server.typeId === GAME_TYPES.CTF
    ) {
      const recover = this.storage.playerRecoverList.get(playerId);

      if (recover.ip === player.ip.current && recover.expired >= Date.now()) {
        isRecovered = true;

        if (this.storage.gameEntity.match.current === recover.data.match && !player.bot.current) {
          isAssignTeamNeeded = false;
        }

        if (!isAssignTeamNeeded) {
          player.team.current = recover.data.team;

          player.upgrades.amount = recover.data.upgrades;
          player.upgrades.speed = recover.data.speedUpgrades;
          player.upgrades.defense = recover.data.defenseUpgrades;
          player.upgrades.energy = recover.data.energyUpgrades;
          player.upgrades.missile = recover.data.missileUpgrades;
        }

        player.recaptures.current = recover.data.recaptures;
        player.captures.current = recover.data.captures;
        player.captures.time = recover.data.capturesTime;
        player.captures.saves = recover.data.capSaves;
        player.captures.savesAfterDeath = recover.data.capSavesAfterDeath;
        player.captures.savesAfterDrop = recover.data.capSavesAfterDrop;
        player.captures.attempts = recover.data.capAttempts;
        player.captures.attemptsFromBase = recover.data.capAttemptsFromBase;
        player.captures.attemptsFromBaseWithShield = recover.data.capAttemptsFromBaseWithShield;
        player.damage.current = recover.data.damage;
        player.damage.bots = recover.data.damageBots;
        player.damage.hits = recover.data.damageHits;
        player.damage.hitsToBots = recover.data.damageHitsToBots;
        player.damage.hitsReceived = recover.data.damageHitsReceived;
        player.damage.hitsByBots = recover.data.damageHitsByBots;
        player.deaths.current = recover.data.deaths;
        player.deaths.byBots = recover.data.deathsByBots;
        player.deaths.withFlag = recover.data.deathsWithFlag;
        player.deaths.withFlagByBots = recover.data.deathsWithFlagByBots;
        player.kills.current = recover.data.kills;
        player.kills.bots = recover.data.killsBots;
        player.kills.totalWithInferno = recover.data.killsWithInferno;
        player.kills.botsWithInferno = recover.data.killsBotsWithInferno;
        player.kills.carriers = recover.data.carriersKills;
        player.kills.carriersBots = recover.data.carriersBotsKills;
        player.score.current = recover.data.score;
        player.stats.fires = recover.data.fires;
        player.stats.fireProjectiles = recover.data.fireProjectiles;

        player.keystate.presses.total = recover.data.pressesTotal;
        player.keystate.presses.FIRE = recover.data.pressesFire;
        player.keystate.presses.UP = recover.data.pressesUp;
        player.keystate.presses.RIGHT = recover.data.pressesRight;
        player.keystate.presses.DOWN = recover.data.pressesDown;
        player.keystate.presses.LEFT = recover.data.pressesLeft;
        player.keystate.presses.SPECIAL = recover.data.pressesSpecial;

        player.times.joinedAt = recover.data.joinedAt;
        player.times.activePlaying = recover.data.activePlaying;
        player.times.activePlayingBlue = recover.data.activePlayingBlue;
        player.times.activePlayingRed = recover.data.activePlayingRed;

        player.stats.matchesTotal = recover.data.matchesTotal;
        player.stats.matchesActivePlayed = recover.data.matchesActivePlayed;
        player.wins.current = recover.data.winsTotal;
        player.stats.switches = recover.data.switches;

        player.upgrades.collected = recover.data.upgradesCollected;
        player.upgrades.used = recover.data.upgradesUsed;
        player.shield.collected = recover.data.shieldsCollected;
        player.inferno.collected = recover.data.infernosCollected;
      }

      this.storage.playerRecoverList.delete(playerId);
    }

    if (isAssignTeamNeeded) {
      this.emit(PLAYERS_ASSIGN_TEAM, player);
    }

    this.emit(PLAYERS_ASSIGN_ALIVE_STATUS, player);
    this.emit(PLAYERS_SET_SHIP_TYPE, player, shipType);
    this.emit(PLAYERS_ASSIGN_SPAWN_POSITION, player);

    /**
     * Players storage filling.
     */
    this.storage.playerNameList.add(uniqueName);
    this.storage.playerList.set(playerId, player);

    /**
     * Hitbox init.
     */
    const hitboxCache = this.storage.shipHitboxesCache[shipType][player.rotation.low];

    player.hitbox.width = hitboxCache.width;
    player.hitbox.height = hitboxCache.height;
    player.hitbox.x = ~~player.position.x + MAP_SIZE.HALF_WIDTH + hitboxCache.x;
    player.hitbox.y = ~~player.position.y + MAP_SIZE.HALF_HEIGHT + hitboxCache.y;

    // TL, TR, BR, BL.
    const hitbox = new Polygon(player.hitbox.x - hitboxCache.x, player.hitbox.y - hitboxCache.y, [
      [hitboxCache.x, hitboxCache.y],
      [-hitboxCache.x, hitboxCache.y],
      [-hitboxCache.x, -hitboxCache.y],
      [hitboxCache.x, -hitboxCache.y],
    ]);

    hitbox.id = playerId;
    hitbox.team = player.team.current;
    hitbox.type = COLLISIONS_OBJECT_TYPES.PLAYER;
    hitbox.isCollideWithViewport = true;
    hitbox.isCollideWithRepel = true;
    player.hitbox.current = hitbox;

    this.emit(COLLISIONS_ADD_OBJECT, player.hitbox.current);

    /**
     * Connections storage filling.
     */
    mainConnection.playerId = playerId;
    mainConnection.teamId = player.team.current;

    this.storage.playerMainConnectionList.set(playerId, connectionId);
    this.storage.mainConnectionIdList.add(connectionId);
    this.storage.connectionIdByNameList[uniqueName] = connectionId;

    if (mainConnection.isBot) {
      this.storage.botIdList.add(playerId);
      this.storage.botConnectionIdList.add(connectionId);
    } else {
      this.storage.humanConnectionIdList.add(connectionId);
    }

    if (this.storage.connectionByIPList.has(mainConnection.ip)) {
      this.storage.connectionByIPList.get(mainConnection.ip).add(connectionId);
    } else {
      this.storage.connectionByIPList.set(mainConnection.ip, new Set([connectionId]));
    }

    if (this.storage.connectionIdByTeam.has(player.team.current)) {
      const teamConnections = this.storage.connectionIdByTeam.get(player.team.current);

      teamConnections.add(connectionId);
    } else {
      this.storage.connectionIdByTeam.set(player.team.current, new Set([connectionId]));
    }

    if (this.storage.ipMuteList.has(mainConnection.ip)) {
      if (this.storage.ipMuteList.get(mainConnection.ip) >= Date.now()) {
        player.times.unmuteTime = this.storage.ipMuteList.get(mainConnection.ip);
      } else {
        this.channel(CHANNEL_MUTE).delay(CHAT_UNMUTE_BY_IP, mainConnection.ip);
      }
    }

    /**
     * Backup connection token.
     */
    this.storage.backupTokenList.set(player.backuptoken.current, playerId);

    /**
     * Viewport init.
     */
    this.emit(PLAYERS_UPDATE_HORIZON, playerId, player.horizon.x, player.horizon.y);
    this.emit(
      VIEWPORTS_CREATE,
      playerId,
      connectionId,
      player.position.x,
      player.position.y,
      player.horizon.validX,
      player.horizon.validY
    );

    /**
     * Broadcasts.
     */
    this.emit(RESPONSE_LOGIN, connectionId);
    this.emit(BROADCAST_PLAYER_NEW, playerId);
    this.emit(RESPONSE_SEND_PING, connectionId);

    if (player.alivestatus.current === PLAYERS_ALIVE_STATUSES.ALIVE) {
      this.emit(PLAYERS_APPLY_SHIELD, playerId, PLAYERS_SPAWN_SHIELD_DURATION_MS);
    }

    if (has(player, 'user')) {
      this.emit(BROADCAST_PLAYER_LEVEL, playerId, PLAYER_LEVEL_UPDATE_TYPES.INFORM);
    }

    this.emit(RESPONSE_SCORE_UPDATE, playerId);

    if (mainConnection.isBot !== true) {
      this.emit(RESPONSE_SERVER_PLAYER_CONNECT, connectionId);
    }

    this.emit(PLAYERS_CREATED, playerId);
    this.emit(BROADCAST_SCORE_BOARD, connectionId);

    if (isRecovered) {
      let hasUpgrades = false;

      if (
        player.upgrades.amount !== 0 ||
        player.upgrades.speed !== 0 ||
        player.upgrades.defense !== 0 ||
        player.upgrades.energy !== 0 ||
        player.upgrades.missile !== 0
      ) {
        hasUpgrades = true;

        this.delay(RESPONSE_PLAYER_UPGRADE, playerId, UPGRADES_ACTION_TYPE.LOST);
      }

      this.emit(
        BROADCAST_CHAT_SERVER_WHISPER,
        playerId,
        `Hi, ${uniqueName}! Your stats ${
          hasUpgrades ? 'and upgrades ' : ''
        }were recovered after disconnection.`
      );
    }

    /**
     * Welcome messages.
     */
    this.channel(CHANNEL_CHAT).delay(CHAT_WELCOME, playerId, uniqueName);

    /**
     * Wait for the next packets by protocol.
     */
    mainConnection.timeouts.backup = setTimeout(() => {
      this.emit(TIMEOUT_BACKUP, connectionId);
    }, CONNECTIONS_PACKET_BACKUP_TIMEOUT_MS);

    mainConnection.timeouts.ack = setTimeout(() => {
      this.emit(TIMEOUT_ACK, connectionId);
    }, CONNECTIONS_PACKET_ACK_TIMEOUT_MS);
  }
}
