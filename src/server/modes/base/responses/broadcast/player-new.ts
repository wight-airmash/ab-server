import { SERVER_PACKETS, encodeUpgrades, ServerPackets } from '@airbattle/protocol';
import { System } from '@/server/system';
import { BROADCAST_PLAYER_NEW, CONNECTIONS_SEND_PACKET } from '@/events';
import { PlayerId } from '@/types';

export default class PlayerNewBroadcast extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [BROADCAST_PLAYER_NEW]: this.onPlayerNew,
    };
  }

  /**
   * Broadcast to all players except event owner.
   *
   * @param playerId
   */
  onPlayerNew(playerId: PlayerId): void {
    if (!this.helpers.isPlayerConnected(playerId)) {
      return;
    }

    const player = this.storage.playerList.get(playerId);
    const playerConnectionId = this.storage.playerMainConnectionList.get(playerId);
    const recipients = [...this.storage.mainConnectionIdList];

    this.emit(
      CONNECTIONS_SEND_PACKET,
      {
        c: SERVER_PACKETS.PLAYER_NEW,
        id: player.id.current,
        status: player.alivestatus.current,
        name: player.name.current,
        type: player.planetype.current,
        team: player.team.current,
        posX: player.position.x,
        posY: player.position.y,
        rot: player.rotation.current,
        flag: player.flag.code,
        upgrades: encodeUpgrades(
          player.upgrades.speed,
          ~~player.shield.current,
          ~~player.inferno.current
        ),
      } as ServerPackets.PlayerNew,
      recipients,
      [playerConnectionId]
    );
  }
}
