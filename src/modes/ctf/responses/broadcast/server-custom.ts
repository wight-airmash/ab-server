import { ServerPackets, SERVER_CUSTOM_TYPES, SERVER_PACKETS } from '@airbattle/protocol';
import { CTF_WIN_ALERT_DURATION_SEC } from '../../../../constants';
import { BROADCAST_SERVER_CUSTOM, CONNECTIONS_SEND_PACKETS } from '../../../../events';
import { System } from '../../../../server/system';
import { MainConnectionId, PlayerId } from '../../../../types';

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
  onServerCustom(playerId: PlayerId = null, bounty = this.storage.gameEntity.match.bounty): void {
    let recipients: MainConnectionId | MainConnectionId[] = null;

    if (playerId !== null) {
      if (this.storage.playerMainConnectionList.has(playerId)) {
        recipients = this.storage.playerMainConnectionList.get(playerId);
      } else {
        return;
      }
    } else {
      recipients = [...this.storage.mainConnectionIdList];
    }

    if (recipients === null) {
      return;
    }

    this.emit(
      CONNECTIONS_SEND_PACKETS,
      {
        c: SERVER_PACKETS.SERVER_CUSTOM,
        type: SERVER_CUSTOM_TYPES.CTF,
        data: JSON.stringify({
          w: this.storage.gameEntity.match.winnerTeam,
          b: bounty,
          t: CTF_WIN_ALERT_DURATION_SEC,
        } as ServerPackets.ServerCustomCTFData),
      } as ServerPackets.ServerCustom,
      recipients
    );
  }
}
