import { ClientPackets } from '@airbattle/protocol';
import { CHANNEL_VOTE_MUTE } from '@/server/channels';
import { ROUTE_VOTEMUTE, CHAT_MUTE_VOTE } from '@/events';
import { System } from '@/server/system';
import { MainConnectionId } from '@/types';

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

    this.channel(CHANNEL_VOTE_MUTE).delay(CHAT_MUTE_VOTE, connection.meta.playerId, msg.id);
    this.log.debug(`Player id${connection.meta.playerId} requested votemute player id${msg.id}.`);
  }
}
