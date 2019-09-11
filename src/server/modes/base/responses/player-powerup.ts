import { SERVER_PACKETS, ServerPackets, PLAYER_POWERUP_TYPES } from '@airbattle/protocol';
import { RESPONSE_PLAYER_POWERUP, CONNECTIONS_SEND_PACKET } from '@/events';
import { System } from '@/server/system';
import { MainConnectionId } from '@/types';

export default class PlayerPowerup extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [RESPONSE_PLAYER_POWERUP]: this.onPlayerPowerup,
    };
  }

  /**
   * Visual apply powerup (shield or inferno) to player.
   * This packet is needed to show an alert (with bottom timeline)
   * for powerup owner. Other players receive info
   * from the `PLAYER_UPDATE` packet.
   *
   *
   * @param connectionId
   * @param type
   * @param duration ms
   */
  onPlayerPowerup(
    connectionId: MainConnectionId,
    type: PLAYER_POWERUP_TYPES,
    duration: number
  ): void {
    this.emit(
      CONNECTIONS_SEND_PACKET,
      {
        c: SERVER_PACKETS.PLAYER_POWERUP,
        type,
        duration,
      } as ServerPackets.PlayerPowerup,
      connectionId
    );
  }
}
