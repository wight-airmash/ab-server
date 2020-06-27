import { ServerPackets, SERVER_PACKETS } from '@airbattle/protocol';
import { BTR_FIREWALL_SPEED } from '../../../../constants';
import { BROADCAST_GAME_FIREWALL, CONNECTIONS_SEND_PACKETS } from '../../../../events';
import { System } from '../../../../server/system';
import { PlayerId } from '../../../../types';

export default class GameFirewallBroadcast extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [BROADCAST_GAME_FIREWALL]: this.onGameFirewall,
    };
  }

  /**
   * BTR firewall state broadcast.
   *
   * Broadcast on:
   * 1. Player connected.
   * 2. Game end.
   * 3. Game start.
   *
   * Broadcast to all players or personally to the player after login.
   */
  onGameFirewall(playerId: PlayerId = null): void {
    const { firewall } = this.storage.gameEntity.match;

    this.emit(
      CONNECTIONS_SEND_PACKETS,
      {
        c: SERVER_PACKETS.GAME_FIREWALL,
        type: 1,
        status: firewall.status,
        posX: firewall.posX,
        posY: firewall.posY,
        radius: firewall.radius,
        speed: BTR_FIREWALL_SPEED,
      } as ServerPackets.GameFirewall,
      playerId === null
        ? [...this.storage.mainConnectionIdList]
        : this.storage.playerMainConnectionList.get(playerId)
    );
  }
}
