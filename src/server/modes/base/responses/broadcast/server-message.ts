import { SERVER_PACKETS, ServerPackets, SERVER_MESSAGE_TYPES } from '@airbattle/protocol';
import { BROADCAST_SERVER_MESSAGE, CONNECTIONS_SEND_PACKET } from '@/events';
import { System } from '@/server/system';

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
      CONNECTIONS_SEND_PACKET,
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
