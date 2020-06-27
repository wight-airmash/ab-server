import { ServerPackets, SERVER_PACKETS } from '@airbattle/protocol';
import { BROADCAST_PLAYERS_ALIVE, CONNECTIONS_SEND_PACKETS } from '../../../../events';
import { System } from '../../../../server/system';
import { PlayerId } from '../../../../types';

export default class PlayersAliveBroadcast extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [BROADCAST_PLAYERS_ALIVE]: this.onPlayersAlive,
    };
  }

  /**
   * Broadcast on:
   * 1. Player death.
   * 2. Player login.
   * ? game start, game end
   *
   * Broadcast to all players or personally to the player after login.
   */
  onPlayersAlive(playerId: PlayerId = null): void {
    this.emit(
      CONNECTIONS_SEND_PACKETS,
      {
        c: SERVER_PACKETS.GAME_PLAYERSALIVE,
        players: this.storage.gameEntity.match.playersAlive,
      } as ServerPackets.GamePlayersalive,
      playerId === null
        ? [...this.storage.mainConnectionIdList]
        : this.storage.playerMainConnectionList.get(playerId)
    );
  }
}
