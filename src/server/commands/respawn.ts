import { LIMITS_RESPAWN, LIMITS_RESPAWN_WEIGHT } from '../../constants';
import { COMMAND_RESPAWN, PLAYERS_RESPAWN } from '../../events';
import { CHANNEL_RESPAWN_PLAYER } from '../../events/channels';
import { MainConnectionId } from '../../types';
import { System } from '../system';

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

    connection.limits.respawn += LIMITS_RESPAWN_WEIGHT;

    if (connection.limits.respawn > LIMITS_RESPAWN) {
      return;
    }

    if (shipType > 0 && shipType < 6 && !connection.pending.respawn) {
      connection.pending.respawn = true;

      this.channel(CHANNEL_RESPAWN_PLAYER).delay(PLAYERS_RESPAWN, connection.playerId, shipType);
    }
  }
}
