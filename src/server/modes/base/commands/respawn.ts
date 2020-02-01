import { COMMAND_RESPAWN, PLAYERS_RESPAWN } from '@/events';
import { System } from '@/server/system';
import { CHANNEL_RESPAWN_PLAYER } from '@/server/channels';
import { MainConnectionId } from '@/types';
import { LIMITS_RESPAWN, LIMITS_RESPAWN_WEIGHT } from '@/constants';

export default class RespawnCommandHandler extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [COMMAND_RESPAWN]: this.onCommandReceived,
    };
  }

  onCommandReceived(connectionId: MainConnectionId, commandArguments: string): void {
    if (!this.storage.connectionList.has(connectionId)) {
      return;
    }

    const connection = this.storage.connectionList.get(connectionId);
    const shipType = ~~commandArguments;

    connection.meta.limits.respawn += LIMITS_RESPAWN_WEIGHT;

    if (connection.meta.limits.respawn > LIMITS_RESPAWN) {
      return;
    }

    if (shipType > 0 && shipType < 6 && connection.meta.pending.respawn === false) {
      connection.meta.pending.respawn = true;

      this.log.debug(
        `Player id${connection.meta.playerId} requested respawn plane type ${shipType}.`
      );

      this.channel(CHANNEL_RESPAWN_PLAYER).delay(
        PLAYERS_RESPAWN,
        connection.meta.playerId,
        shipType
      );
    }
  }
}
