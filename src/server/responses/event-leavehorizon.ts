import { LEAVE_HORIZON_TYPES, ServerPackets, SERVER_PACKETS } from '@airbattle/protocol';
import { CONNECTIONS_SEND_PACKETS, RESPONSE_EVENT_LEAVE_HORIZON } from '../../events';
import { MainConnectionId, MobId } from '../../types';
import { System } from '../system';

export default class EventLeaveHorizonResponse extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [RESPONSE_EVENT_LEAVE_HORIZON]: this.onLeaveHorizon,
    };
  }

  /**
   * Sent when mob or player leaves player's viewport.
   *
   * @param connectionId
   * @param mobIds
   */
  onLeaveHorizon(connectionId: MainConnectionId, mobIds: Set<MobId>): void {
    mobIds.forEach(id => {
      if (this.storage.mobIdList.has(id)) {
        const type = this.storage.playerList.has(id)
          ? LEAVE_HORIZON_TYPES.PLAYER
          : LEAVE_HORIZON_TYPES.MOB;

        this.emit(
          CONNECTIONS_SEND_PACKETS,
          {
            c: SERVER_PACKETS.EVENT_LEAVEHORIZON,
            type,
            id,
          } as ServerPackets.EventLeavehorizon,
          connectionId
        );
      }
    });
  }
}
