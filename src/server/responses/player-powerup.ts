import { PLAYER_POWERUP_TYPES, ServerPackets, SERVER_PACKETS } from '@airbattle/protocol';
import { CONNECTIONS_SEND_PACKETS, RESPONSE_PLAYER_POWERUP } from '../../events';
import { MainConnectionId } from '../../types';
import { System } from '../system';

export default class PlayerPowerupResponse extends System {
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
      CONNECTIONS_SEND_PACKETS,
      {
        c: SERVER_PACKETS.PLAYER_POWERUP,
        type,
        duration,
      } as ServerPackets.PlayerPowerup,
      connectionId
    );
  }
}
