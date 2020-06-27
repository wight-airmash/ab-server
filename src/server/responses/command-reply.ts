import { COMMAND_REPLY_TYPES, ServerPackets, SERVER_PACKETS } from '@airbattle/protocol';
import { CONNECTIONS_SEND_PACKETS, RESPONSE_COMMAND_REPLY } from '../../events';
import { MainConnectionId } from '../../types';
import { System } from '../system';

export default class CommandReplyResponse extends System {
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
      CONNECTIONS_SEND_PACKETS,
      {
        c: SERVER_PACKETS.COMMAND_REPLY,
        type,
        text,
      } as ServerPackets.CommandReply,
      connectionId
    );
  }
}
