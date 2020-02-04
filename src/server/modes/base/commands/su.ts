import { LIMITS_SU, LIMITS_SU_WEIGHT } from '@/constants';
import { BROADCAST_CHAT_SERVER_WHISPER, COMMAND_SU, RESPONSE_COMMAND_REPLY } from '@/events';
import { System } from '@/server/system';
import { MainConnectionId } from '@/types';

export default class SuperuserCommandHandler extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [COMMAND_SU]: this.onCommandReceived,
    };
  }

  onCommandReceived(connectionId: MainConnectionId, password: string): void {
    const connection = this.storage.connectionList.get(connectionId);

    if (
      !this.storage.connectionList.has(connectionId) ||
      !this.helpers.isPlayerConnected(connection.meta.playerId)
    ) {
      return;
    }

    if (connection.meta.limits.su > LIMITS_SU) {
      this.emit(RESPONSE_COMMAND_REPLY, connectionId, 'Too frequent requests.');

      return;
    }

    connection.meta.limits.su += LIMITS_SU_WEIGHT;

    if (password === this.app.config.suPassword) {
      const { playerId } = connection.meta;
      const player = this.storage.playerList.get(playerId);

      player.su.current = true;

      this.emit(BROADCAST_CHAT_SERVER_WHISPER, playerId, 'You have superuser rights now.');

      this.log.info(`Player id${playerId} became superuser.`);
    }
  }
}
