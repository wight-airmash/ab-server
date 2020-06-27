import { ClientPackets } from '@airbattle/protocol';
import { CHAT_MUTE_VOTE, ROUTE_VOTEMUTE } from '../../events';
import { CHANNEL_MUTE } from '../../events/channels';
import { MainConnectionId } from '../../types';
import { System } from '../system';

export default class VotemuteMessageHandler extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [ROUTE_VOTEMUTE]: this.onMessageReceived,
    };
  }

  /**
   * Handle `Votemute` request
   *
   * @param connectionId player connection id
   * @param msg player packet
   */
  onMessageReceived(connectionId: MainConnectionId, msg: ClientPackets.Votemute): void {
    if (!this.storage.connectionList.has(connectionId)) {
      return;
    }

    const connection = this.storage.connectionList.get(connectionId);

    this.channel(CHANNEL_MUTE).delay(CHAT_MUTE_VOTE, connection.playerId, msg.id);
  }
}
