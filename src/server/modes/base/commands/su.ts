import { COMMAND_SU, BROADCAST_CHAT_SERVER_WHISPER, RESPONSE_COMMAND_REPLY } from '@/events';
import { System } from '@/server/system';
import { MainConnectionId } from '@/types';
import { LIMITS_SU_WEIGHT, LIMITS_SU } from '@/constants';

export default class SuperuserCommandHandler extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [COMMAND_SU]: this.onCommandReceived,
    };
  }

  onCommandReceived(connectionId: MainConnectionId, password: string): void {
    if (!this.storage.connectionList.has(connectionId)) {
      return;
    }

    const connection = this.storage.connectionList.get(connectionId);

    if (connection.meta.limits.su > LIMITS_SU) {
      this.emit(RESPONSE_COMMAND_REPLY, connectionId, 'Too frequent requests.');

      return;
    }

    connection.meta.limits.su += LIMITS_SU_WEIGHT;

    if (connection && password === this.app.config.suPassword) {
      const player = this.storage.playerList.get(connection.meta.playerId);

      this.emit(
        BROADCAST_CHAT_SERVER_WHISPER,
        connection.meta.playerId,
        'You have superuser rights now.'
      );
      this.log.debug(`Player id${connection.meta.playerId} became superuser.`);

      player.su.current = true;
    }
  }
}
