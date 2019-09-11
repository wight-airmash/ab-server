import { BTR_FIREWALL_STATUS, ServerPackets, SERVER_PACKETS } from '@airbattle/protocol';
import { CONNECTIONS_SEND_PACKET } from '@/events';
import { System } from '@/server/system';
import { PlayerId } from '@/types';

export default class GameFirewallBroadcast extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {};
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
  onServerCustom(playerId: PlayerId = null): void {
    this.emit(
      CONNECTIONS_SEND_PACKET,
      {
        c: SERVER_PACKETS.GAME_PLAYERSALIVE,
        type: 0,
        status: BTR_FIREWALL_STATUS.ACTIVE,
        posX: 0,
        posY: 0,
        radius: 0,
        speed: 0,
      } as ServerPackets.GameFirewall,
      playerId === null
        ? [...this.storage.mainConnectionIdList]
        : this.storage.playerMainConnectionList.get(playerId)
    );
  }
}
