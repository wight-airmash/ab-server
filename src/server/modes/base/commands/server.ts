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
  COMMAND_SERVER,
  CONNECTIONS_BAN_IP,
  CONNECTIONS_KICK,
  CONNECTIONS_UNBAN_IP,
  PLAYERS_KICK,
  RESPONSE_COMMAND_REPLY,
} from '@/events';
import { System } from '@/server/system';
import { has } from '@/support/objects';
import { MainConnectionId } from '@/types';

export default class ServerCommandHandler extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [COMMAND_SERVER]: this.onCommandReceived,
    };
  }

  onCommandReceived(connectionId: MainConnectionId, command = ''): void {
    const connection = this.storage.connectionList.get(connectionId);
    const player = this.storage.playerList.get(connection.meta.playerId);

    if (command === '') {
      this.log.debug(`Player id${connection.meta.playerId} checked server health.`);

      this.emit(
        BROADCAST_CHAT_SERVER_WHISPER,
        connection.meta.playerId,
        [
          `GLL: ${this.app.metrics.lastSample.ll} ms/s, `,
          `PPS: ${this.app.metrics.lastSample.ppsIn}/${this.app.metrics.lastSample.ppsOut}, `,
          `RAM: ${this.app.metrics.lastSample.ram} MB, `,
          `CPU: ${this.app.metrics.lastSample.cpu}%, `,
          `SF: ${this.app.config.server.scaleFactor}, `,
          `uptime: ${this.app.metrics.uptime.human}, `,
          `v${this.app.config.version}`,
        ].join('')
      );
    } else if (command === 'upgrades') {
      this.emit(
        BROADCAST_CHAT_SERVER_WHISPER,
        connection.meta.playerId,
        `Min: ${this.app.config.upgradesDropMinChance}, max: ${this.app.config.upgradesDropMaxChance}`
      );
    } else if (command === 'powerups') {
      this.emit(
        BROADCAST_CHAT_SERVER_WHISPER,
        connection.meta.playerId,
        `Spawn chance: ${this.app.config.powerupSpawnChance}`
      );
    } else if (command === 'debug') {
      if (player.su.current === false) {
        if (connection.meta.limits.debug > LIMITS_DEBUG) {
          this.emit(RESPONSE_COMMAND_REPLY, connectionId, 'Too frequent requests.');

          return;
        }

        connection.meta.limits.debug += LIMITS_DEBUG_WEIGHT;
      }

      this.emit(
        BROADCAST_CHAT_SERVER_WHISPER,
        connection.meta.playerId,
        [
          `Skipped frames: ${this.app.metrics.lastSample.sf}. `,
          `Connections: ${this.storage.connectionList.size} total, `,
          `${this.storage.mainConnectionIdList.size} main, `,
          `${this.storage.playerBackupConnectionList.size} backup, `,
          `${this.storage.connectionIdByTeam.size} teamed, `,
          `${Object.keys(this.storage.connectionIdByNameList).length} named, `,
          `next id: ${this.storage.nextConnectionId}. `,
          `IP: ${this.storage.connectionByIPList.size} unique, `,
          `${this.storage.ipBanList.size} banned, `,
          `${this.storage.ipMuteList.size} muted, `,
          `${this.storage.ipWhiteList.size} in the whitelist. `,
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
    } else if (command === 'limits') {
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
    } else if (player.su.current === true) {
      /**
       * Superuser commands.
       */

      if (command === 'health') {
        this.emit(
          BROADCAST_CHAT_SERVER_PUBLIC,
          [
            `GLL: ${this.app.metrics.lastSample.ll} ms/s, `,
            `PPS: ${this.app.metrics.lastSample.ppsIn}/${this.app.metrics.lastSample.ppsOut}, `,
            `RAM: ${this.app.metrics.lastSample.ram} MB, `,
            `CPU: ${this.app.metrics.lastSample.cpu}%, `,
            `SF: ${this.app.config.server.scaleFactor}, `,
            `uptime: ${this.app.metrics.uptime.human}`,
          ].join('')
        );
      } else if (command.startsWith('say ')) {
        const text = command.substring('say '.length);

        this.emit(BROADCAST_CHAT_SERVER_PUBLIC, text);
      } else if (command.startsWith('ban')) {
        const addCommand = 'ban add ';
        const hasCommand = 'ban has ';
        const removeCommand = 'ban remove ';

        if (command.startsWith(addCommand)) {
          const ip = command.substring(addCommand.length).trim();

          this.emit(CONNECTIONS_BAN_IP, ip, CONNECTIONS_SUPERUSER_BAN_MS, 'Superuser');
          this.emit(BROADCAST_CHAT_SERVER_WHISPER, connection.meta.playerId, 'IP added.');
        } else if (command.startsWith(removeCommand)) {
          const ip = command.substring(removeCommand.length).trim();

          this.emit(CONNECTIONS_UNBAN_IP, ip);
          this.emit(BROADCAST_CHAT_SERVER_WHISPER, connection.meta.playerId, 'IP removed.');
        } else if (command.startsWith(hasCommand)) {
          const ip = command.substring(hasCommand.length).trim();

          if (this.storage.ipBanList.has(ip)) {
            this.emit(
              BROADCAST_CHAT_SERVER_WHISPER,
              connection.meta.playerId,
              `true, exipred: ${this.storage.ipBanList.get(ip).expire}, reason: ${
                this.storage.ipBanList.get(ip).reason
              }`
            );
          } else {
            this.emit(BROADCAST_CHAT_SERVER_WHISPER, connection.meta.playerId, 'false.');
          }
        }
      } else if (command.startsWith('whitelist')) {
        if (command === 'whitelist') {
          this.emit(
            BROADCAST_CHAT_SERVER_WHISPER,
            connection.meta.playerId,
            `Whitelist ${this.app.config.whitelist === true ? 'enabled' : 'disabled'}.`
          );

          return;
        }

        if (command === 'whitelist on' || command === 'whitelist true') {
          this.app.config.whitelist = true;

          this.emit(
            BROADCAST_CHAT_SERVER_WHISPER,
            connection.meta.playerId,
            'Whitelist turned on.'
          );

          return;
        }

        if (command === 'whitelist off' || command === 'whitelist false') {
          this.app.config.whitelist = false;

          this.emit(
            BROADCAST_CHAT_SERVER_WHISPER,
            connection.meta.playerId,
            'Whitelist turned off.'
          );
        }
      } else if (command.startsWith('bot')) {
        const addCommand = 'bot add ';
        const removeCommand = 'bot remove ';

        if (command.startsWith(addCommand)) {
          const ip = command.substring(addCommand.length).trim();

          this.storage.ipWhiteList.add(ip);

          this.emit(BROADCAST_CHAT_SERVER_WHISPER, connection.meta.playerId, 'Bot IP added.');
        } else if (command.startsWith(removeCommand)) {
          const ip = command.substring(removeCommand.length).trim();

          this.storage.ipWhiteList.delete(ip);

          this.emit(BROADCAST_CHAT_SERVER_WHISPER, connection.meta.playerId, 'Bot IP removed.');
        }
      } else if (command.startsWith('mute')) {
        const idCommand = 'mute id ';
        const nameCommand = 'mute name ';
        const ipCommand = 'mute ip ';
        const expired = Date.now() + CHAT_SUPERUSER_MUTE_TIME_MS;

        if (command.startsWith(idCommand)) {
          const playerId = ~~command.substring(idCommand.length);

          if (!this.helpers.isPlayerConnected(playerId)) {
            this.emit(BROADCAST_CHAT_SERVER_WHISPER, connection.meta.playerId, 'Player not found.');
          } else {
            if (connection.meta.playerId === playerId) {
              return;
            }

            const muteConnection = this.storage.connectionList.get(
              this.storage.playerMainConnectionList.get(playerId)
            );

            this.storage.ipMuteList.set(muteConnection.meta.ip, expired);

            const spammer = this.storage.playerList.get(muteConnection.meta.playerId);

            spammer.times.unmuteTime = expired;

            this.emit(BROADCAST_CHAT_SERVER_WHISPER, connection.meta.playerId, 'Player muted.');
          }
        } else if (command.startsWith(nameCommand)) {
          const playerName = command.substring(nameCommand.length);

          if (!has(this.storage.connectionIdByNameList, playerName)) {
            this.emit(BROADCAST_CHAT_SERVER_WHISPER, connection.meta.playerId, 'Player not found.');
          } else {
            const muteConnectionId = this.storage.connectionIdByNameList[playerName];

            if (connection.meta.id === muteConnectionId) {
              return;
            }

            const muteConnection = this.storage.connectionList.get(muteConnectionId);

            this.storage.ipMuteList.set(muteConnection.meta.ip, expired);

            const spammer = this.storage.playerList.get(muteConnection.meta.playerId);

            spammer.times.unmuteTime = expired;

            this.emit(BROADCAST_CHAT_SERVER_WHISPER, connection.meta.playerId, 'Player muted.');
          }
        } else if (command.startsWith(ipCommand)) {
          const ip = command.substring(ipCommand.length).trim();

          this.storage.ipMuteList.set(ip, expired);

          this.emit(BROADCAST_CHAT_SERVER_WHISPER, connection.meta.playerId, 'IP muted.');
        }
      } else if (command.startsWith('unmute')) {
        const idCommand = 'unmute id ';
        const nameCommand = 'unmute name ';
        const ipCommand = 'unmute ip ';

        if (command.startsWith(idCommand)) {
          const playerId = ~~command.substring(idCommand.length);

          if (!this.helpers.isPlayerConnected(playerId)) {
            this.emit(BROADCAST_CHAT_SERVER_WHISPER, connection.meta.playerId, 'Player not found.');
          } else {
            const unmuteConnection = this.storage.connectionList.get(
              this.storage.playerMainConnectionList.get(playerId)
            );

            this.storage.ipMuteList.delete(unmuteConnection.meta.ip);

            this.emit(BROADCAST_CHAT_SERVER_WHISPER, connection.meta.playerId, 'Player unmuted.');
          }
        } else if (command.startsWith(nameCommand)) {
          const playerName = command.substring(nameCommand.length);

          if (!has(this.storage.connectionIdByNameList, playerName)) {
            this.emit(BROADCAST_CHAT_SERVER_WHISPER, connection.meta.playerId, 'Player not found.');
          } else {
            const unmuteConnectionId = this.storage.connectionIdByNameList[playerName];
            const unmuteConnection = this.storage.connectionList.get(unmuteConnectionId);

            this.storage.ipMuteList.delete(unmuteConnection.meta.ip);

            this.emit(BROADCAST_CHAT_SERVER_WHISPER, connection.meta.playerId, 'Player unmuted.');
          }
        } else if (command.startsWith(ipCommand)) {
          const ip = command.substring(ipCommand.length).trim();

          this.storage.ipMuteList.delete(ip);

          this.emit(BROADCAST_CHAT_SERVER_WHISPER, connection.meta.playerId, 'IP unmuted.');
        }
      } else if (command.startsWith('kick')) {
        const idCommand = 'kick id ';
        const nameCommand = 'kick name ';

        if (command.startsWith(idCommand)) {
          const playerId = ~~command.substring(idCommand.length);

          if (connection.meta.playerId === playerId) {
            return;
          }

          if (!this.helpers.isPlayerConnected(playerId)) {
            this.emit(BROADCAST_CHAT_SERVER_WHISPER, connection.meta.playerId, 'Player not found.');
          } else {
            this.emit(PLAYERS_KICK, playerId);
            this.emit(BROADCAST_CHAT_SERVER_WHISPER, connection.meta.playerId, 'Player kicked.');
          }
        } else if (command.startsWith(nameCommand)) {
          const playerName = command.substring(nameCommand.length);

          if (!has(this.storage.connectionIdByNameList, playerName)) {
            this.emit(BROADCAST_CHAT_SERVER_WHISPER, connection.meta.playerId, 'Player not found.');
          } else {
            const kickConnectionId = this.storage.connectionIdByNameList[playerName];

            this.emit(CONNECTIONS_KICK, kickConnectionId);
            this.emit(BROADCAST_CHAT_SERVER_WHISPER, connection.meta.playerId, 'Player kicked.');
          }
        }
      } else if (command.startsWith('powerups')) {
        const value = parseFloat(command.substring(9));

        if (value > 0 && value <= 1) {
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
      } else if (command.startsWith('upgrades')) {
        if (command.startsWith('upgrades min') && command.length > 13) {
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
              connection.meta.playerId,
              `Drop chance updated: [${this.app.config.upgradesDropMinChance}, ${this.app.config.upgradesDropMaxChance}].`
            );
          } else {
            this.emit(
              RESPONSE_COMMAND_REPLY,
              connectionId,
              `Invalid value. Allowed values: [0..${this.app.config.upgradesDropMaxChance}).`
            );
          }
        } else if (command.startsWith('upgrades max') && command.length > 13) {
          const value = parseFloat(command.substring(13));

          if (value > this.app.config.upgradesDropMinChance && value <= 1) {
            this.app.config.upgradesDropMaxChance = value;

            this.log.debug(`Upgrades drop max chance updated: ${value}.`);
            this.emit(
              BROADCAST_CHAT_SERVER_WHISPER,
              connection.meta.playerId,
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
    }
  }
}
