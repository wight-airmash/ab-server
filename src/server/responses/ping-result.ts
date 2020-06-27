import { ServerPackets, SERVER_PACKETS } from '@airbattle/protocol';
import { CONNECTIONS_SEND_PACKETS, RESPONSE_PING_RESULT } from '../../events';
import { MainConnectionId } from '../../types';
import { System } from '../system';

export default class PingResultResponse extends System {
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
    const player = this.storage.playerList.get(connection.playerId);

    this.emit(
      CONNECTIONS_SEND_PACKETS,
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
