import { ServerPackets, SERVER_CUSTOM_TYPES, SERVER_PACKETS } from '@airbattle/protocol';
import { CTF_WIN_ALERT_DURATION_SEC } from '@/constants';
import { BROADCAST_SERVER_CUSTOM, CONNECTIONS_SEND_PACKET } from '@/events';
import { System } from '@/server/system';

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
      CONNECTIONS_SEND_PACKET,
      {
        c: SERVER_PACKETS.SERVER_CUSTOM,
        type: SERVER_CUSTOM_TYPES.CTF,
        data: JSON.stringify({
          w: this.storage.gameEntity.match.winnerTeam,
          b: this.storage.gameEntity.match.bounty,
          t: CTF_WIN_ALERT_DURATION_SEC,
        } as ServerPackets.ServerCustomCTFData),
      } as ServerPackets.ServerCustom,
      [...this.storage.mainConnectionIdList]
    );
  }
}
