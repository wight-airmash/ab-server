import { encodeUpgrades, ServerPackets, SERVER_PACKETS } from '@airbattle/protocol';
import { CONNECTIONS_SEND_PACKETS, CTF_REMOVE_PLAYER_FROM_LEADER } from '../../../events';
import { System } from '../../../server/system';
import { PlayerId } from '../../../types';

/**
 * This implementation is only applicable to Q-bots.
 * Two packets PLAYER_LEAVE and PLAYER_NEW are sent to the random bot.
 * The player does not actually leave, but the bots think it was reconnection
 * and start the new leader election.
 */
export default class PhantomPlayerKick extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [CTF_REMOVE_PLAYER_FROM_LEADER]: this.onKickPlayer,
    };
  }

  onKickPlayer(playerId: PlayerId): void {
    if (!this.helpers.isPlayerConnected(playerId) || this.storage.botConnectionIdList.size === 0) {
      return;
    }

    const player = this.storage.playerList.get(playerId);

    if (player.planestate.flagspeed) {
      return;
    }

    const recipients = [...this.storage.botConnectionIdList];

    this.emit(
      CONNECTIONS_SEND_PACKETS,
      {
        c: SERVER_PACKETS.PLAYER_LEAVE,
        id: playerId,
      } as ServerPackets.PlayerLeave,
      recipients
    );

    this.emit(
      CONNECTIONS_SEND_PACKETS,
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
        isBot: false,
      } as ServerPackets.PlayerNew,
      recipients
    );
  }
}
