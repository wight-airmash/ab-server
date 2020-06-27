import { LIMITS_CHAT_SPAM_ATTEMPTS_TO_MUTE, LIMITS_CHAT_WEIGHT } from '../../constants';
import {
  CHAT_CHECK_LIMITS,
  CHAT_MUTE_BY_SERVER,
  RESPONSE_COMMAND_REPLY,
  RESPONSE_VOTEMUTED,
} from '../../events';
import { PlayerConnection } from '../../types';
import { System } from '../system';

export default class ChatGuard extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [CHAT_CHECK_LIMITS]: this.onCheckLimits,
    };
  }

  onCheckLimits(connection: PlayerConnection): void {
    const isMuted = this.helpers.isPlayerMuted(connection.playerId);

    connection.limits.chat += LIMITS_CHAT_WEIGHT;

    if (isMuted) {
      this.emit(RESPONSE_VOTEMUTED, connection.id);

      return;
    }

    if (connection.limits.chat > this.config.connections.packetLimits.chat) {
      connection.limits.spam += 1;

      if (connection.limits.spam < LIMITS_CHAT_SPAM_ATTEMPTS_TO_MUTE) {
        this.emit(RESPONSE_COMMAND_REPLY, connection.id, "Don't spam!");
      } else {
        connection.limits.spam = 0;
        this.emit(CHAT_MUTE_BY_SERVER, connection.playerId);
      }
    }
  }
}
