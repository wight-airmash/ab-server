import {
  CHAT_SUPERUSER_MUTE_TIME_MS,
  CONNECTIONS_SUPERUSER_BAN_MS,
  LIMITS_DEBUG,
  LIMITS_DEBUG_WEIGHT,
  SERVER_MIN_SERVICE_MOB_ID,
} from '@/constants';
import {
  BROADCAST_CHAT_SERVER_PUBLIC,
  BROADCAST_CHAT_SERVER_WHISPER,
  CHAT_MUTE_BY_IP,
  CHAT_UNMUTE_BY_IP,
  COMMAND_SERVER,
  CONNECTIONS_BAN_IP,
  CONNECTIONS_FLUSH_BANS,
  CONNECTIONS_KICK,
  CONNECTIONS_UNBAN_IP,
  PLAYERS_KICK,
  RESPONSE_COMMAND_REPLY,
} from '@/events';
import { System } from '@/server/system';
import { has } from '@/support/objects';
import { ConnectionId, MainConnectionId, PlayerConnection, PlayerId } from '@/types';

export default class ServerCommandHandler extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [COMMAND_SERVER]: this.onCommandReceived,
    };
  }

  protected getServerAbout(): string {
    return [
      `GLL: ${this.app.metrics.lastSample.ll} ms/s, `,
      `PPS: ${this.app.metrics.lastSample.ppsIn}/${this.app.metrics.lastSample.ppsOut}, `,
      `RAM: ${this.app.metrics.lastSample.ram} MB, `,
      `CPU: ${this.app.metrics.lastSample.cpu}%, `,
      `SF: ${this.app.config.server.scaleFactor}, `,
      `uptime: ${this.app.metrics.uptime.human}, `,
      `v${this.app.config.version}`,
    ].join('');
  }

  /**
   * /server
   *
   * @param playerId
   */
  protected responseServerAbout(playerId: PlayerId): void {
    this.emit(BROADCAST_CHAT_SERVER_WHISPER, playerId, this.getServerAbout());
  }

  /**
   * /server health
   */
  protected broadcastServerHealth(): void {
    this.emit(BROADCAST_CHAT_SERVER_PUBLIC, this.getServerAbout());
  }

  /**
   * /server upgrades
   *
   * @param playerId
   */
  protected responseServerUpgrades(playerId: PlayerId): void {
    this.emit(
      BROADCAST_CHAT_SERVER_WHISPER,
      playerId,
      `Min: ${this.app.config.upgradesDropMinChance}, max: ${this.app.config.upgradesDropMaxChance}`
    );
  }

  /**
   * /server powerups
   *
   * @param playerId
   */
  protected responseServerPowerups(playerId: PlayerId): void {
    this.emit(
      BROADCAST_CHAT_SERVER_WHISPER,
      playerId,
      `Spawn chance: ${this.app.config.powerupSpawnChance}`
    );
  }

  /**
   * /server limits
   *
   * @param connection
   */
  protected responsePlayerLimits(connection: PlayerConnection): void {
    this.emit(
      BROADCAST_CHAT_SERVER_WHISPER,
      connection.meta.playerId,
      [
        `Any: ${connection.meta.limits.any}, `,
        `key: ${connection.meta.limits.key}, `,
        `chat: ${connection.meta.limits.chat}, `,
        `spam: ${connection.meta.limits.spam}, `,
        `respawn: ${connection.meta.limits.respawn}, `,
        `spectate: ${connection.meta.limits.spectate}.`,
      ].join('')
    );
  }

  /**
   * /server debug
   *
   * @param playerId
   */
  protected responseServerDebug(playerId: PlayerId): void {
    this.emit(
      BROADCAST_CHAT_SERVER_WHISPER,
      playerId,
      [
        `Skipped frames: ${this.app.metrics.lastSample.sf}. `,
        `Connections: ${this.storage.connectionList.size} total, `,
        `${this.storage.mainConnectionIdList.size} main, `,
        `${this.storage.playerBackupConnectionList.size} backup, `,
        `${this.storage.connectionIdByTeam.size} teamed, `,
        `${Object.keys(this.storage.connectionIdByNameList).length} named, `,
        `next id: ${this.storage.nextConnectionId}. `,
        `IP: ${this.storage.connectionByIPCounter.size} unique, `,
        `${this.storage.ipBanList.size} banned, `,
        `${this.storage.ipMuteList.size} muted, `,
        `${this.storage.ipWhiteList.size} in the whitelist. `,
        `Users: ${this.storage.userList.size} total, `,
        `${this.storage.onlineUserIdList.size} online. `,
        `Mobs: ${this.storage.mobIdList.size} total, `,
        `${this.storage.playerList.size} players, `,
        `${this.storage.botIdList.size} bots, `,
        `${this.storage.playerInSpecModeList.size} spectators, `,
        `${this.storage.mobList.size -
          (this.storage.nextServiceMobId - SERVER_MIN_SERVICE_MOB_ID - 1)} other mobs, `,
        `${this.storage.nextServiceMobId - SERVER_MIN_SERVICE_MOB_ID - 1} service mobs, `,
        `${this.storage.repelList.size} repels, `,
        `${this.storage.projectileIdList.size} projectiles, `,
        `${this.storage.shieldIdList.size} shields, `,
        `${this.storage.infernoIdList.size} infernos, `,
        `${this.storage.upgradeIdList.size} upgrades, `,
        `${this.storage.playerHistoryNameToIdList.size} reserved ids, `,
        `next id: ${this.storage.nextMobId}. `,
        `Viewports: ${this.storage.viewportList.size}, `,
        `${this.storage.broadcast.size} broadcast. `,
        `Recover: ${this.storage.playerRecoverList.size} records.`,
      ].join('')
    );
  }

  /**
   * /server ban <subcommand> [value]
   *
   * @param playerId
   * @param command
   */
  protected handleBanCommand(playerId: PlayerId, command: string): void {
    const addCommand = 'ban add ';
    const hasCommand = 'ban has ';
    const removeCommand = 'ban remove ';
    const listCommand = 'ban list';
    const flushCommand = 'ban flush';

    if (command === listCommand) {
      if (this.storage.ipBanList.size === 0) {
        this.emit(BROADCAST_CHAT_SERVER_WHISPER, playerId, 'The ban list is empty.');
      } else {
        this.storage.ipBanList.forEach((ban, ip) => {
          this.emit(BROADCAST_CHAT_SERVER_WHISPER, playerId, `${ip}, ${ban.reason}`);
        });
      }

      return;
    }

    if (command === flushCommand) {
      const totalBans = this.storage.ipBanList.size;

      this.emit(CONNECTIONS_FLUSH_BANS);
      this.emit(
        BROADCAST_CHAT_SERVER_WHISPER,
        playerId,
        `The ban list has been cleared (${totalBans}).`
      );

      return;
    }

    if (command.indexOf(addCommand) === 0) {
      const ip = command.substring(addCommand.length).trim();

      this.emit(CONNECTIONS_BAN_IP, ip, CONNECTIONS_SUPERUSER_BAN_MS, 'Superuser');
      this.emit(BROADCAST_CHAT_SERVER_WHISPER, playerId, 'IP added.');

      return;
    }

    if (command.indexOf(removeCommand) === 0) {
      const ip = command.substring(removeCommand.length).trim();

      this.emit(CONNECTIONS_UNBAN_IP, ip);
      this.emit(BROADCAST_CHAT_SERVER_WHISPER, playerId, 'IP removed.');

      return;
    }

    if (command.indexOf(hasCommand) === 0) {
      const ip = command.substring(hasCommand.length).trim();

      if (this.storage.ipBanList.has(ip)) {
        this.emit(
          BROADCAST_CHAT_SERVER_WHISPER,
          playerId,
          `true, exipred: ${this.storage.ipBanList.get(ip).expire}, reason: ${
            this.storage.ipBanList.get(ip).reason
          }`
        );
      } else {
        this.emit(BROADCAST_CHAT_SERVER_WHISPER, playerId, 'false.');
      }
    }
  }

  /**
   * /server kick <subcommand> [value]
   *
   * @param connectionId
   * @param playerId
   * @param command
   */
  protected handleKickCommand(
    connectionId: ConnectionId,
    playerId: PlayerId,
    command: string
  ): void {
    const idCommand = 'kick id ';
    const nameCommand = 'kick name ';

    if (command.indexOf(idCommand) === 0) {
      const playerToKickId = ~~command.substring(idCommand.length);

      if (playerId === playerToKickId) {
        return;
      }

      if (!this.helpers.isPlayerConnected(playerToKickId)) {
        this.emit(BROADCAST_CHAT_SERVER_WHISPER, playerId, 'Player not found.');
      } else {
        this.emit(PLAYERS_KICK, playerToKickId);
        this.emit(BROADCAST_CHAT_SERVER_WHISPER, playerId, 'Player kicked.');
      }

      return;
    }

    if (command.indexOf(nameCommand) === 0) {
      const playerName = command.substring(nameCommand.length);

      if (!has(this.storage.connectionIdByNameList, playerName)) {
        this.emit(BROADCAST_CHAT_SERVER_WHISPER, playerId, 'Player not found.');
      } else {
        const kickConnectionId = this.storage.connectionIdByNameList[playerName];

        if (connectionId === kickConnectionId) {
          return;
        }

        this.emit(CONNECTIONS_KICK, kickConnectionId);
        this.emit(BROADCAST_CHAT_SERVER_WHISPER, playerId, 'Player kicked.');
      }
    }
  }

  /**
   * /server mute <subcommand> [value]
   *
   * @param connectionId
   * @param playerId
   * @param command
   */
  protected handleMuteCommand(
    connectionId: ConnectionId,
    playerId: PlayerId,
    command: string
  ): void {
    const idCommand = 'mute id ';
    const nameCommand = 'mute name ';
    const ipCommand = 'mute ip ';

    /**
     * Mute by ID.
     */
    if (command.indexOf(idCommand) === 0) {
      const playerToMuteId = ~~command.substring(idCommand.length);

      if (!this.helpers.isPlayerConnected(playerToMuteId)) {
        this.emit(BROADCAST_CHAT_SERVER_WHISPER, playerId, 'Player not found.');
      } else {
        if (playerId === playerToMuteId) {
          return;
        }

        const muteConnection = this.storage.connectionList.get(
          this.storage.playerMainConnectionList.get(playerToMuteId)
        );

        this.emit(CHAT_MUTE_BY_IP, muteConnection.meta.ip, CHAT_SUPERUSER_MUTE_TIME_MS);
        this.emit(BROADCAST_CHAT_SERVER_WHISPER, playerId, 'Player muted.');
      }

      return;
    }

    /**
     * Mute by name.
     */
    if (command.indexOf(nameCommand) === 0) {
      const playerName = command.substring(nameCommand.length);

      if (!has(this.storage.connectionIdByNameList, playerName)) {
        this.emit(BROADCAST_CHAT_SERVER_WHISPER, playerId, 'Player not found.');
      } else {
        const muteConnectionId = this.storage.connectionIdByNameList[playerName];

        if (
          connectionId === muteConnectionId ||
          !this.storage.connectionList.has(muteConnectionId)
        ) {
          return;
        }

        const muteConnection = this.storage.connectionList.get(muteConnectionId);

        this.emit(CHAT_MUTE_BY_IP, muteConnection.meta.ip, CHAT_SUPERUSER_MUTE_TIME_MS);
        this.emit(BROADCAST_CHAT_SERVER_WHISPER, playerId, 'Player muted.');
      }

      return;
    }

    /**
     * Mute by IP.
     */
    if (command.indexOf(ipCommand) === 0) {
      const ip = command.substring(ipCommand.length).trim();

      this.emit(CHAT_MUTE_BY_IP, ip, CHAT_SUPERUSER_MUTE_TIME_MS);
      this.emit(BROADCAST_CHAT_SERVER_WHISPER, playerId, 'IP muted.');
    }
  }

  /**
   * /server unmute <subcommand> [value]
   *
   * @param playerId
   * @param command
   */
  protected handleUnmuteCommand(playerId: PlayerId, command: string): void {
    const idCommand = 'unmute id ';
    const nameCommand = 'unmute name ';
    const ipCommand = 'unmute ip ';

    /**
     * Unmute by ID.
     */
    if (command.indexOf(idCommand) === 0) {
      const playerToUnmuteId = ~~command.substring(idCommand.length);

      if (!this.helpers.isPlayerConnected(playerToUnmuteId)) {
        this.emit(BROADCAST_CHAT_SERVER_WHISPER, playerId, 'Player not found.');
      } else {
        const unmuteConnection = this.storage.connectionList.get(
          this.storage.playerMainConnectionList.get(playerToUnmuteId)
        );

        this.emit(CHAT_UNMUTE_BY_IP, unmuteConnection.meta.ip);
        this.emit(BROADCAST_CHAT_SERVER_WHISPER, playerId, 'Player unmuted.');
      }

      return;
    }

    /**
     * Unmute by name.
     */
    if (command.indexOf(nameCommand) === 0) {
      const playerName = command.substring(nameCommand.length);

      if (!has(this.storage.connectionIdByNameList, playerName)) {
        this.emit(BROADCAST_CHAT_SERVER_WHISPER, playerId, 'Player not found.');
      } else {
        const unmuteConnectionId = this.storage.connectionIdByNameList[playerName];

        if (!this.storage.connectionList.has(unmuteConnectionId)) {
          return;
        }

        const unmuteConnection = this.storage.connectionList.get(unmuteConnectionId);

        this.emit(CHAT_UNMUTE_BY_IP, unmuteConnection.meta.ip);
        this.emit(BROADCAST_CHAT_SERVER_WHISPER, playerId, 'Player unmuted.');
      }

      return;
    }

    /**
     * Unmute by IP.
     */
    if (command.indexOf(ipCommand) === 0) {
      const ip = command.substring(ipCommand.length).trim();

      this.emit(CHAT_UNMUTE_BY_IP, ip);
      this.emit(BROADCAST_CHAT_SERVER_WHISPER, playerId, 'IP unmuted.');
    }
  }

  /**
   * /server bot <subcommand> [value]
   *
   * @param playerId
   * @param command
   */
  protected handleBotCommand(playerId: PlayerId, command: string): void {
    const addCommand = 'bot add ';
    const removeCommand = 'bot remove ';

    if (command.indexOf(addCommand) === 0) {
      const ip = command.substring(addCommand.length).trim();

      this.storage.ipWhiteList.add(ip);

      this.emit(BROADCAST_CHAT_SERVER_WHISPER, playerId, 'Bot IP added.');

      return;
    }

    if (command.indexOf(removeCommand) === 0) {
      const ip = command.substring(removeCommand.length).trim();

      this.storage.ipWhiteList.delete(ip);

      this.emit(BROADCAST_CHAT_SERVER_WHISPER, playerId, 'Bot IP removed.');
    }
  }

  /**
   * /server powerups <value>
   *
   * @param connectionId
   * @param command
   */
  protected handlePowerupsSetupCommand(connectionId: ConnectionId, command: string): void {
    const value = parseFloat(command.substring(9));

    if (value >= 0 && value <= 1) {
      if (value < this.app.config.powerupSpawnChance) {
        this.emit(BROADCAST_CHAT_SERVER_PUBLIC, 'Powerups spawn chance decreased.');
      } else {
        this.emit(BROADCAST_CHAT_SERVER_PUBLIC, 'Powerups spawn chance increased.');
      }

      this.app.config.powerupSpawnChance = value;

      this.log.debug(`Powerups spawn chance updated: ${value}.`);
    } else {
      this.emit(RESPONSE_COMMAND_REPLY, connectionId, 'Invalid value. Allowed values: [0..1]');
    }
  }

  /**
   * /server upgrades <subcommand> [value]
   *
   * @param connectionId
   * @param playerId
   * @param command
   */
  protected handleUpgradesSetupCommand(
    connectionId: ConnectionId,
    playerId: PlayerId,
    command: string
  ): void {
    if (command.indexOf('upgrades min') === 0 && command.length > 13) {
      const value = parseFloat(command.substring(13));

      if (value >= 0 && value < this.app.config.upgradesDropMaxChance) {
        if (value > this.app.config.upgradesDropMinChance) {
          this.emit(BROADCAST_CHAT_SERVER_PUBLIC, 'Upgrades drop chance increased.');
        } else {
          this.emit(BROADCAST_CHAT_SERVER_PUBLIC, 'Upgrades drop chance decreased.');
        }

        this.app.config.upgradesDropMinChance = value;

        this.log.debug(`Upgrades drop min chance updated: ${value}.`);
        this.emit(
          BROADCAST_CHAT_SERVER_WHISPER,
          playerId,
          `Drop chance updated: [${this.app.config.upgradesDropMinChance}, ${this.app.config.upgradesDropMaxChance}].`
        );
      } else {
        this.emit(
          RESPONSE_COMMAND_REPLY,
          connectionId,
          `Invalid value. Allowed values: [0..${this.app.config.upgradesDropMaxChance}).`
        );
      }

      return;
    }

    if (command.indexOf('upgrades max') === 0 && command.length > 13) {
      const value = parseFloat(command.substring(13));

      if (value > this.app.config.upgradesDropMinChance && value <= 1) {
        this.app.config.upgradesDropMaxChance = value;

        this.log.debug(`Upgrades drop max chance updated: ${value}.`);
        this.emit(
          BROADCAST_CHAT_SERVER_WHISPER,
          playerId,
          `Drop chance updated: [${this.app.config.upgradesDropMinChance}, ${this.app.config.upgradesDropMaxChance}].`
        );
      } else {
        this.emit(
          RESPONSE_COMMAND_REPLY,
          connectionId,
          `Invalid value. Allowed values: (${this.app.config.upgradesDropMinChance}..1].`
        );
      }
    }
  }

  /**
   * "/server" command handler.
   *
   * @param connectionId
   * @param command
   */
  onCommandReceived(connectionId: MainConnectionId, command = ''): void {
    const connection = this.storage.connectionList.get(connectionId);

    if (
      !this.storage.connectionList.has(connectionId) ||
      !this.helpers.isPlayerConnected(connection.meta.playerId)
    ) {
      return;
    }

    const { playerId } = connection.meta;
    const player = this.storage.playerList.get(connection.meta.playerId);

    if (command === '') {
      this.responseServerAbout(playerId);

      return;
    }

    if (command === 'upgrades') {
      this.responseServerUpgrades(playerId);

      return;
    }

    if (command === 'powerups') {
      this.responseServerPowerups(playerId);

      return;
    }

    if (command === 'limits') {
      this.responsePlayerLimits(connection);

      return;
    }

    if (command === 'debug') {
      if (player.su.current === false) {
        if (connection.meta.limits.debug > LIMITS_DEBUG) {
          this.emit(RESPONSE_COMMAND_REPLY, connectionId, 'Too frequent requests.');

          return;
        }

        connection.meta.limits.debug += LIMITS_DEBUG_WEIGHT;
      }

      this.responseServerDebug(playerId);

      return;
    }

    /**
     * Superuser commands.
     */
    if (player.su.current === true) {
      if (command === 'health') {
        this.broadcastServerHealth();

        return;
      }

      if (command === 'whitelist') {
        this.emit(
          BROADCAST_CHAT_SERVER_WHISPER,
          playerId,
          `Whitelist ${this.app.config.whitelist === true ? 'enabled' : 'disabled'}.`
        );

        return;
      }

      if (command === 'whitelist on' || command === 'whitelist true') {
        this.app.config.whitelist = true;

        this.emit(BROADCAST_CHAT_SERVER_WHISPER, playerId, 'Whitelist turned on.');

        return;
      }

      if (command === 'whitelist off' || command === 'whitelist false') {
        this.app.config.whitelist = false;

        this.emit(BROADCAST_CHAT_SERVER_WHISPER, playerId, 'Whitelist turned off.');

        return;
      }

      if (command.indexOf('say ') === 0) {
        const text = command.substring('say '.length);

        this.emit(BROADCAST_CHAT_SERVER_PUBLIC, text);

        return;
      }

      if (command.indexOf('ban') === 0) {
        this.handleBanCommand(playerId, command);

        return;
      }

      if (command.indexOf('bot') === 0) {
        this.handleBotCommand(playerId, command);

        return;
      }

      if (command.indexOf('mute') === 0) {
        this.handleMuteCommand(connectionId, playerId, command);

        return;
      }

      if (command.indexOf('unmute') === 0) {
        this.handleUnmuteCommand(playerId, command);

        return;
      }

      if (command.indexOf('kick') === 0) {
        this.handleKickCommand(connectionId, playerId, command);

        return;
      }

      if (command.indexOf('powerups') === 0) {
        this.handlePowerupsSetupCommand(connectionId, command);

        return;
      }

      if (command.indexOf('upgrades') === 0) {
        this.handleUpgradesSetupCommand(connectionId, playerId, command);
      }
    }
  }
}
