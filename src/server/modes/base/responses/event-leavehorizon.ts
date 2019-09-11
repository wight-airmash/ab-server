import { SERVER_PACKETS, LEAVE_HORIZON_TYPES, ServerPackets } from '@airbattle/protocol';
import { RESPONSE_EVENT_LEAVE_HORIZON, CONNECTIONS_SEND_PACKET } from '@/events';
import { System } from '@/server/system';
import { MainConnectionId, MobId } from '@/types';

export default class EventLeaveHorizon extends System {
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
      if (this.storage.mobIdList.has(id) && !this.storage.playerInSpecModeList.has(id)) {
        const type = this.storage.playerList.has(id)
          ? LEAVE_HORIZON_TYPES.PLAYER
          : LEAVE_HORIZON_TYPES.MOB;

        this.emit(
          CONNECTIONS_SEND_PACKET,
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
