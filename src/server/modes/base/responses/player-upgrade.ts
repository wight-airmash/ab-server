import { SERVER_PACKETS, ServerPackets, PLAYER_UPGRADE_TYPES } from '@airbattle/protocol';
import { RESPONSE_PLAYER_UPGRADE, CONNECTIONS_SEND_PACKET } from '@/events';
import { System } from '@/server/system';

export default class PlayerUpgrade extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [RESPONSE_PLAYER_UPGRADE]: this.onPlayerUpgrade,
    };
  }

  /**
   * Apply or lost upgrades.
   *
   * @param playerId
   * @param type
   */
  onPlayerUpgrade(playerId: number, type: PLAYER_UPGRADE_TYPES): void {
    const connectionId = this.storage.playerMainConnectionList.get(playerId);
    const player = this.storage.playerList.get(playerId);

    this.emit(
      CONNECTIONS_SEND_PACKET,
      {
        c: SERVER_PACKETS.PLAYER_UPGRADE,
        type,
        upgrades: player.upgrades.amount,
        speed: player.upgrades.speed,
        defense: player.upgrades.defense,
        energy: player.upgrades.energy,
        missile: player.upgrades.missile,
      } as ServerPackets.PlayerUpgrade,
      connectionId
    );
  }
}
