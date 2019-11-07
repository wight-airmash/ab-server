import { GAME_TYPES } from '@airbattle/protocol';
import { PLAYERS_TIME_TO_RESTORE_PLAYER_MS } from '@/constants';
import {
  PLAYERS_BEFORE_REMOVE,
  BROADCAST_PLAYER_LEAVE,
  PLAYERS_REMOVE,
  PLAYERS_EMIT_CHANNEL_DISCONNECT,
  PLAYERS_REMOVED,
  COLLISIONS_REMOVE_OBJECT,
  VIEWPORTS_REMOVE,
} from '@/events';
import { CHANNEL_DISCONNECT_PLAYER } from '@/server/channels';
import { System } from '@/server/system';
import { PlayerId } from '@/types';

export default class GamePlayersDisconnect extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      // Channels.
      [PLAYERS_EMIT_CHANNEL_DISCONNECT]: this.onDisconnectPlayers,

      // Events.
      [PLAYERS_REMOVE]: this.removePlayerData,
    };
  }

  /**
   * Emit delayed events.
   */
  onDisconnectPlayers(): void {
    this.channel(CHANNEL_DISCONNECT_PLAYER).emitDelayed();
  }

  /**
   * Remove player data from the game.
   *
   * @param playerId
   */
  removePlayerData(playerId: PlayerId): void {
    if (this.storage.playerList.has(playerId)) {
      const player = this.storage.playerList.get(playerId);

      this.emit(PLAYERS_BEFORE_REMOVE, player);

      /**
       * Recover stats feature.
       * CTF only.
       */
      if (this.app.config.server.typeId === GAME_TYPES.CTF) {
        this.storage.playerRecoverList.set(playerId, {
          expired: Date.now() + PLAYERS_TIME_TO_RESTORE_PLAYER_MS,
          ip: player.ip.current,
          data: {
            match: this.storage.gameEntity.match.current,

            team: player.team.current,
            type: player.planetype.current,
            alive: player.alivestatus.current,

            captures: player.captures.current,
            recaptures: player.recaptures.current,
            capSaves: player.captures.saves,
            capAttempts: player.captures.attempts,
            damage: player.damage.current,
            deaths: player.deaths.current,
            deathsWithFlag: player.deaths.withFlag,
            health: player.health.current,
            energy: player.energy.current,
            kills: player.kills.current,
            carriersKills: player.kills.carriers,
            score: player.score.current,

            x: player.position.x,
            y: player.position.y,
            rot: player.rotation.current,

            upgrades: player.upgrades.amount,
            speedUpgrades: player.upgrades.speed,
            defenseUpgrades: player.upgrades.defense,
            energyUpgrades: player.upgrades.energy,
            missileUpgrades: player.upgrades.missile,

            lastSwitch: player.times.lastSwitch,
            activePlaying: player.times.activePlaying,
            activePlayingRed: player.times.activePlayingRed,
            activePlayingBlue: player.times.activePlayingBlue,
          },
        });

        this.log.debug(`Save recovery data for player id${playerId}, ip ${player.ip.current}`);
      }

      this.log.debug(`Player ${player.name.current} id${playerId} removed from the game.`);

      delete this.storage.connectionIdByNameList[player.name.current];

      /**
       * Clear player storage.
       */
      this.storage.playerInSpecModeList.delete(playerId);
      this.storage.repelList.delete(playerId);
      this.storage.playerNameList.delete(player.name.current);
      this.storage.playerList.delete(playerId);
      this.storage.mobIdList.delete(playerId);
      this.storage.backupTokenList.delete(player.backuptoken.current);
      this.storage.botIdList.delete(playerId);

      if (this.storage.viewportList.has(player.spectate.current)) {
        const viewport = this.storage.viewportList.get(player.spectate.current);

        viewport.subs.delete(player.id.current);
      }

      this.emit(VIEWPORTS_REMOVE, playerId);
      this.emit(COLLISIONS_REMOVE_OBJECT, player.hitbox.current);

      player.destroy();

      this.emit(BROADCAST_PLAYER_LEAVE, playerId);

      this.emit(PLAYERS_REMOVED, playerId);
    }
  }
}
