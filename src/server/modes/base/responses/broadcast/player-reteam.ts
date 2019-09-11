import { SERVER_PACKETS, ServerPackets } from '@airbattle/protocol';
import { System } from '@/server/system';
import { BROADCAST_PLAYER_RETEAM, CONNECTIONS_SEND_PACKET } from '@/events';
import { PlayerId } from '@/types';

export default class PlayerReteamBroadcast extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [BROADCAST_PLAYER_RETEAM]: this.onPlayerReteam,
    };
  }

  /**
   * Broadcast to all players.
   *
   * @param newTeamPlayers
   */
  onPlayerReteam(newTeamPlayers: PlayerId[]): void {
    const players = [];

    for (let playerIndex = 0; playerIndex < newTeamPlayers.length; playerIndex += 1) {
      if (this.storage.playerList.has(newTeamPlayers[playerIndex])) {
        const player = this.storage.playerList.get(newTeamPlayers[playerIndex]);

        players.push({
          id: player.id.current,
          team: player.team.current,
        } as ServerPackets.PlayerReteamPlayers);
      }
    }

    if (players.length === 0) {
      return;
    }

    this.emit(
      CONNECTIONS_SEND_PACKET,
      {
        c: SERVER_PACKETS.PLAYER_RETEAM,
        players,
      } as ServerPackets.PlayerReteam,
      [...this.storage.mainConnectionIdList]
    );
  }
}
