import { ServerPackets, SERVER_MESSAGE_TYPES, SERVER_PACKETS } from '@airbattle/protocol';
import { BROADCAST_SERVER_MESSAGE, CONNECTIONS_SEND_PACKETS } from '../../../events';
import { System } from '../../system';

export default class ServerMessageBroadcast extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [BROADCAST_SERVER_MESSAGE]: this.onServerMessage,
    };
  }

  /**
   * Broadcast to all players.
   *
   * @param text
   * @param type
   * @param duration
   */
  onServerMessage(text: string, type: SERVER_MESSAGE_TYPES, duration: number): void {
    this.emit(
      CONNECTIONS_SEND_PACKETS,
      {
        c: SERVER_PACKETS.SERVER_MESSAGE,
        type,
        duration,
        text,
      } as ServerPackets.ServerMessage,
      [...this.storage.mainConnectionIdList]
    );
  }
}
