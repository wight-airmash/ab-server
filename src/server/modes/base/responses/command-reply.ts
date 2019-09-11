import { COMMAND_REPLY_TYPES, SERVER_PACKETS, ServerPackets } from '@airbattle/protocol';
import { RESPONSE_COMMAND_REPLY, CONNECTIONS_SEND_PACKET } from '@/events';
import { System } from '@/server/system';
import { MainConnectionId } from '@/types';

export default class CommandReply extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [RESPONSE_COMMAND_REPLY]: this.onCommandReply,
    };
  }

  onCommandReply(connectionId: MainConnectionId, data: string | object): void {
    let type = COMMAND_REPLY_TYPES.CHAT;
    let text = data;

    if (typeof data !== 'string') {
      type = COMMAND_REPLY_TYPES.DEBUG;
      text = JSON.stringify(data);
    }

    this.emit(
      CONNECTIONS_SEND_PACKET,
      {
        c: SERVER_PACKETS.COMMAND_REPLY,
        type,
        text,
      } as ServerPackets.CommandReply,
      connectionId
    );
  }
}
