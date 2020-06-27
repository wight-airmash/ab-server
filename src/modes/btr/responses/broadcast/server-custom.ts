import { ServerPackets, SERVER_CUSTOM_TYPES, SERVER_PACKETS } from '@airbattle/protocol';
import { BTR_WIN_ALERT_DURATION_SEC } from '../../../../constants';
import { BROADCAST_SERVER_CUSTOM, CONNECTIONS_SEND_PACKETS } from '../../../../events';
import { System } from '../../../../server/system';

export default class ServerCustomBroadcast extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [BROADCAST_SERVER_CUSTOM]: this.onServerCustom,
    };
  }

  /**
   * End game alert.
   * Broadcast to all players.
   */
  onServerCustom(): void {
    this.emit(
      CONNECTIONS_SEND_PACKETS,
      {
        c: SERVER_PACKETS.SERVER_CUSTOM,
        type: SERVER_CUSTOM_TYPES.BTR,
        data: JSON.stringify({
          f: this.storage.gameEntity.match.winnerFlag,
          p: this.storage.gameEntity.match.winnerName,
          k: this.storage.gameEntity.match.winnerKills,
          b: this.storage.gameEntity.match.bounty,
          t: BTR_WIN_ALERT_DURATION_SEC,
        } as ServerPackets.ServerCustomBTRData),
      } as ServerPackets.ServerCustom,
      [...this.storage.mainConnectionIdList]
    );
  }
}
