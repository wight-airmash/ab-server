import { GAME_TYPES, PLAYER_LEVEL_UPDATE_TYPES } from '@airbattle/protocol';
import { Polygon } from 'collisions';
import {
  CHAT_FIRST_MESSAGE_SAFE_DELAY_MS,
  CHAT_USERNAME_PLACEHOLDER,
  COLLISIONS_OBJECT_TYPES,
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
} from '@/constants';
import {
  BROADCAST_CHAT_SERVER_WHISPER,
  BROADCAST_PLAYER_LEVEL,
  BROADCAST_PLAYER_NEW,
  BROADCAST_SCORE_BOARD,
  CHAT_UNMUTE_BY_IP,
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
} from '@/events';
import { CHANNEL_CONNECT_PLAYER, CHANNEL_MUTE } from '@/server/channels';
import AliveStatus from '@/server/components/alive-status';
import Captures from '@/server/components/captures';
import Damage from '@/server/components/damage';
import Deaths from '@/server/components/deaths';
import Delayed from '@/server/components/delayed';
import Energy from '@/server/components/energy';
import Flag from '@/server/components/flag';
import Health from '@/server/components/health';
import HitCircles from '@/server/components/hit-circles';
import Hitbox from '@/server/components/hitbox';
import Horizon from '@/server/components/horizon';
import Inferno from '@/server/components/inferno-powerup';
import Ip from '@/server/components/ip';
import Keystate from '@/server/components/keystate';
import Kills from '@/server/components/kills';
import Level from '@/server/components/level';
import LifetimeStats from '@/server/components/lifetime-stats';
import Id from '@/server/components/mob-id';
import Ping from '@/server/components/ping';
import PlaneState from '@/server/components/plane-state';
import PlaneType from '@/server/components/plane-type';
import Name from '@/server/components/player-name';
import Position from '@/server/components/position';
import Recaptures from '@/server/components/recaptures';
import Repel from '@/server/components/repel';
import Rotation from '@/server/components/rotation';
import Score from '@/server/components/score';
import Shield from '@/server/components/shield-powerup';
import Spectate from '@/server/components/spectate';
import Su from '@/server/components/su';
import Team from '@/server/components/team';
import Times from '@/server/components/times';
import Token from '@/server/components/token';
import Upgrades from '@/server/components/upgrades';
import User from '@/server/components/user';
import Velocity from '@/server/components/velocity';
import Wins from '@/server/components/wins';
import Entity from '@/server/entity';
import { System } from '@/server/system';
import { getRandomInt } from '@/support/numbers';
import { has } from '@/support/objects';
import { generateBackupToken } from '@/support/strings';

export default class GamePlayersConnect extends System {
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
    this.channel(CHANNEL_CONNECT_PLAYER).emitDelayed();
  }

  /**
   * Create server bot.
   */
  createServerPlayer(): void {
    this.storage.serverPlayerId = this.helpers.createServiceMobId();
    this.storage.playerNameList.add(this.app.config.bot.name);
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

    if (this.storage.onlineUserIdList.has(userId)) {
      this.emit(ERRORS_ALREADY_LOGGED_IN, connectionId);

      return;
    }

    const mainConnection = this.storage.connectionList.get(connectionId);
    let uniqueName = name;

    while (this.storage.playerNameList.has(uniqueName)) {
      uniqueName = `${name}#${getRandomInt(101, 999)}`;
    }

    /**
     * FFA and CTF have default type "Predator".
     */
    const shipType =
      this.app.config.server.typeId === GAME_TYPES.BTR
        ? this.storage.gameEntity.match.shipType
        : SHIPS_TYPES.PREDATOR;

    const player = new Entity().attach(
      new Id(this.helpers.createMobId(uniqueName)),
      new Level(0),
      new Name(uniqueName, name),
      new Horizon(horizon.x, horizon.y),
      new Flag(flag),
      new PlaneType(shipType),
      new PlaneState(),
      new AliveStatus(PLAYERS_ALIVE_STATUSES.DEFAULT),
      new Token(generateBackupToken()),
      new Position(0, 0),
      new Velocity(0, 0),
      new Health(),
      new Energy(),
      new Damage(),
      new Rotation(),
      new Upgrades(UPGRADES_START_AMOUNT),
      new Captures(),
      new Recaptures(),
      new Shield(true, Date.now() + PLAYERS_SPAWN_SHIELD_DURATION_MS),
      new Inferno(),
      new Keystate(),
      new Kills(),
      new Deaths(),
      new Wins(),
      new Score(),
      new Ping(),
      new Times(),
      new Delayed(),
      new Hitbox(),
      new HitCircles([...SHIPS_SPECS[shipType].collisions]),
      new Spectate(),
      new Su(),
      new Ip(mainConnection.meta.ip),
      new Repel()
    );

    player.attach(new Team(player.id.current));

    /**
     * Retrieve or init user account stats.
     */
    if (userId.length > 0) {
      this.storage.onlineUserIdList.add(userId);
      player.attach(new User(userId));

      let user: Entity;

      if (this.storage.userList.has(userId)) {
        user = this.storage.userList.get(userId);
      } else {
        user = new Entity().attach(new Id(userId), new LifetimeStats());
        this.storage.userList.set(userId, user);
      }

      player.level.current = this.helpers.convertEarningsToLevel(user.lifetimestats.earnings);
    }

    this.log.info('Player connected.', {
      id: player.id.current,
      name: player.name.current,
      ip: player.ip.current,
      connection: connectionId,
    });

    /**
     * Player stats recovering after disconnection.
     * CTF only.
     */
    let isAssignTeamNeeded = true;
    let isRecovered = false;

    if (
      this.storage.playerRecoverList.has(player.id.current) &&
      this.app.config.server.typeId === GAME_TYPES.CTF
    ) {
      const recover = this.storage.playerRecoverList.get(player.id.current);

      if (recover.ip === player.ip.current && recover.expired >= Date.now()) {
        isRecovered = true;

        if (this.storage.gameEntity.match.current === recover.data.match) {
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
        player.captures.saves = recover.data.capSaves;
        player.captures.attempts = recover.data.capAttempts;
        player.damage.current = recover.data.damage;
        player.deaths.current = recover.data.deaths;
        player.deaths.withFlag = recover.data.deathsWithFlag;
        player.kills.current = recover.data.kills;
        player.kills.carriers = recover.data.carriersKills;
        player.score.current = recover.data.score;

        player.times.activePlaying = recover.data.activePlaying;
        player.times.activePlayingBlue = recover.data.activePlayingBlue;
        player.times.activePlayingRed = recover.data.activePlayingRed;

        this.log.debug(`Player id${player.id.current} data recovered.`);
      } else {
        this.log.debug(`Player id${player.id.current} recovery data expired.`);
      }

      this.storage.playerRecoverList.delete(player.id.current);
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
    this.storage.playerNameList.add(name);
    this.storage.playerList.set(player.id.current, player);

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

    hitbox.id = player.id.current;
    hitbox.type = COLLISIONS_OBJECT_TYPES.PLAYER;
    player.hitbox.current = hitbox;

    this.emit(COLLISIONS_ADD_OBJECT, player.hitbox.current);

    /**
     * Connections storage filling.
     */
    mainConnection.meta.playerId = player.id.current;
    mainConnection.meta.teamId = player.team.current;

    this.storage.playerMainConnectionList.set(player.id.current, connectionId);
    this.storage.mainConnectionIdList.add(connectionId);
    this.storage.connectionIdByNameList[uniqueName] = connectionId;

    if (mainConnection.meta.isBot === true) {
      this.storage.botIdList.add(player.id.current);
      this.storage.botConnectionIdList.add(connectionId);
    } else {
      this.storage.humanConnectionIdList.add(connectionId);
    }

    if (this.storage.connectionByIPList.has(mainConnection.meta.ip)) {
      this.storage.connectionByIPList.get(mainConnection.meta.ip).add(connectionId);
    } else {
      this.storage.connectionByIPList.set(mainConnection.meta.ip, new Set([connectionId]));
    }

    if (this.storage.connectionIdByTeam.has(player.team.current)) {
      const teamConnections = this.storage.connectionIdByTeam.get(player.team.current);

      teamConnections.add(connectionId);
    } else {
      this.storage.connectionIdByTeam.set(player.team.current, new Set([connectionId]));
    }

    if (this.storage.ipMuteList.has(mainConnection.meta.ip)) {
      if (this.storage.ipMuteList.get(mainConnection.meta.ip) >= Date.now()) {
        player.times.unmuteTime = this.storage.ipMuteList.get(mainConnection.meta.ip);
      } else {
        this.channel(CHANNEL_MUTE).delay(CHAT_UNMUTE_BY_IP, mainConnection.meta.ip);
      }
    }

    /**
     * Backup connection token.
     */
    this.storage.backupTokenList.set(player.backuptoken.current, player.id.current);

    /**
     * Viewport init.
     */
    this.emit(PLAYERS_UPDATE_HORIZON, player.id.current, player.horizon.x, player.horizon.y);
    this.emit(
      VIEWPORTS_CREATE,
      player.id.current,
      player.position.x,
      player.position.y,
      player.horizon.validX,
      player.horizon.validY
    );

    /**
     * Broadcasts.
     */
    this.emit(RESPONSE_LOGIN, connectionId);
    this.emit(BROADCAST_PLAYER_NEW, player.id.current);
    this.emit(BROADCAST_SCORE_BOARD, connectionId);
    this.emit(RESPONSE_SEND_PING, connectionId);
    this.emit(PLAYERS_APPLY_SHIELD, player.id.current, PLAYERS_SPAWN_SHIELD_DURATION_MS);

    if (has(player, 'user')) {
      this.emit(BROADCAST_PLAYER_LEVEL, player.id.current, PLAYER_LEVEL_UPDATE_TYPES.INFORM);
    }

    this.emit(RESPONSE_SCORE_UPDATE, player.id.current);

    if (mainConnection.meta.isBot !== true) {
      this.emit(RESPONSE_SERVER_PLAYER_CONNECT, connectionId);
    }

    this.emit(PLAYERS_CREATED, player.id.current);

    const playerId = player.id.current;

    if (isRecovered === true) {
      if (
        player.upgrades.amount !== 0 ||
        player.upgrades.speed !== 0 ||
        player.upgrades.defense !== 0 ||
        player.upgrades.energy !== 0 ||
        player.upgrades.missile !== 0
      ) {
        this.delay(RESPONSE_PLAYER_UPGRADE, playerId, UPGRADES_ACTION_TYPE.LOST);
      }

      // Starmash anti-spam fix.
      setTimeout(() => {
        try {
          this.emit(
            BROADCAST_CHAT_SERVER_WHISPER,
            playerId,
            `Take back your numbers, ${uniqueName}!`
          );
        } catch (err) {
          this.log.debug('Player is already gone.', err.stack);
        }
      }, CHAT_FIRST_MESSAGE_SAFE_DELAY_MS);
    }

    /**
     * Welcome messages.
     */
    setTimeout(() => {
      try {
        const reg = new RegExp(CHAT_USERNAME_PLACEHOLDER, 'g');

        for (let msgIndex = 0; msgIndex < this.app.config.welcomeMessages.length; msgIndex += 1) {
          const msg = this.app.config.welcomeMessages[msgIndex].replace(reg, uniqueName);

          this.emit(BROADCAST_CHAT_SERVER_WHISPER, playerId, msg);
        }
      } catch (err) {
        this.log.debug('Player is already gone.', err.stack);
      }
    }, CHAT_FIRST_MESSAGE_SAFE_DELAY_MS);

    /**
     * Wait for the next packets by protocol.
     */
    mainConnection.meta.timeouts.backup = setTimeout(() => {
      this.emit(TIMEOUT_BACKUP, connectionId);
    }, CONNECTIONS_PACKET_BACKUP_TIMEOUT_MS);

    mainConnection.meta.timeouts.ack = setTimeout(() => {
      this.emit(TIMEOUT_ACK, connectionId);
    }, CONNECTIONS_PACKET_ACK_TIMEOUT_MS);
  }
}
