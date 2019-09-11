import { SERVER_PACKETS, ServerPackets } from '@airbattle/protocol';
import { RESPONSE_PING_RESULT, CONNECTIONS_SEND_PACKET } from '@/events';
import { System } from '@/server/system';
import { MainConnectionId } from '@/types';

export default class PingResult extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [RESPONSE_PING_RESULT]: this.onPingResult,
    };
  }

  /**
   * Response on player's valid `Pong` packet.
   *
   * @param connectionId
   */
  onPingResult(connectionId: MainConnectionId): void {
    const connection = this.storage.connectionList.get(connectionId);
    const player = this.storage.playerList.get(connection.meta.playerId);

    this.emit(
      CONNECTIONS_SEND_PACKET,
      {
        c: SERVER_PACKETS.PING_RESULT,
        ping: player.ping.current,
        playerstotal: this.storage.playerList.size,
        playersgame: this.storage.playerList.size,
      } as ServerPackets.PingResult,
      connectionId
    );
  }
}
