import { LIMITS_SU, LIMITS_SU_WEIGHT } from '../../constants';
import { BROADCAST_CHAT_SERVER_WHISPER, COMMAND_SU, RESPONSE_COMMAND_REPLY } from '../../events';
import { MainConnectionId } from '../../types';
import { System } from '../system';

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
      !this.helpers.isPlayerConnected(connection.playerId)
    ) {
      return;
    }

    if (connection.limits.su > LIMITS_SU) {
      this.emit(RESPONSE_COMMAND_REPLY, connectionId, 'Too frequent requests.');

      return;
    }

    connection.limits.su += LIMITS_SU_WEIGHT;

    const { playerId } = connection;

    if (password === this.config.suPassword) {
      const player = this.storage.playerList.get(playerId);

      player.su.current = true;

      this.emit(BROADCAST_CHAT_SERVER_WHISPER, playerId, 'You have superuser rights now.');

      this.log.info('Player became superuser: %o', {
        playerId,
      });
    } else {
      this.log.info('Wrong superuser password: %o', {
        playerId,
      });
    }
  }
}
