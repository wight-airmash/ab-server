import { GAME_TYPES } from '@airbattle/protocol';
import {
  BROADCAST_PLAYER_LEAVE,
  COLLISIONS_REMOVE_OBJECT,
  PLAYERS_BEFORE_REMOVE,
  PLAYERS_EMIT_CHANNEL_DISCONNECT,
  PLAYERS_REMOVE,
  PLAYERS_REMOVED,
  PLAYERS_REPEL_DELETE,
  SYNC_ENQUEUE_UPDATE,
  SYNC_UNSUBSCRIBE,
  VIEWPORTS_REMOVE,
} from '../../../events';
import { CHANNEL_DISCONNECT_PLAYER } from '../../../events/channels';
import { has } from '../../../support/objects';
import { PlayerId } from '../../../types';
import { System } from '../../system';

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

      this.helpers.storePlayerStats(player)

      delete this.storage.connectionIdByNameList[player.name.current];

      /**
       * Clear player storage.
       */
      this.emit(PLAYERS_REPEL_DELETE, player);

      this.storage.playerIdSayBroadcastList.delete(playerId);
      this.storage.playerInSpecModeList.delete(playerId);
      this.storage.playerNameList.delete(player.name.current);
      this.storage.playerList.delete(playerId);
      this.storage.mobIdList.delete(playerId);
      this.storage.backupTokenList.delete(player.backuptoken.current);
      this.storage.botIdList.delete(playerId);

      if (has(player, 'user')) {
        this.storage.users.online.delete(player.user.id);

        if (this.config.sync.enabled) {
          const eventDetail = { flag: player.flag.current };

          this.emit(SYNC_ENQUEUE_UPDATE, 'user', player.user.id, {}, Date.now(), [
            'logout',
            eventDetail,
          ]);

          this.emit(SYNC_UNSUBSCRIBE, 'user', player.user.id);
        }
      }

      if (this.storage.viewportList.has(player.spectate.current)) {
        const viewport = this.storage.viewportList.get(player.spectate.current);

        viewport.subs.delete(player.id.current);
      }

      this.emit(VIEWPORTS_REMOVE, playerId);
      this.emit(COLLISIONS_REMOVE_OBJECT, player.hitbox.current);
      this.emit(BROADCAST_PLAYER_LEAVE, playerId);

      this.log.info('Player disconnected and removed from the game: %o', {
        playerId,
      });

      this.emit(PLAYERS_REMOVED, playerId);
    }
  }
}
