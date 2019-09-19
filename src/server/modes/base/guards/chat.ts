import { LIMITS_CHAT, LIMITS_CHAT_SPAM_ATTEMPTS_TO_MUTE, LIMITS_CHAT_WEIGHT } from '@/constants';
import {
  CHAT_CHECK_LIMITS,
  CHAT_MUTE_BY_SERVER,
  RESPONSE_COMMAND_REPLY,
  RESPONSE_VOTEMUTED,
} from '@/events';
import { System } from '@/server/system';
import { PlayerConnection } from '@/types';

export default class ChatGuard extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [CHAT_CHECK_LIMITS]: this.onCheckLimits,
    };
  }

  onCheckLimits(connection: PlayerConnection): void {
    const isMuted = this.helpers.isPlayerMuted(connection.meta.playerId);

    connection.meta.limits.chat += LIMITS_CHAT_WEIGHT;

    if (isMuted === true) {
      this.emit(RESPONSE_VOTEMUTED, connection.meta.id);

      return;
    }

    if (connection.meta.limits.chat > LIMITS_CHAT) {
      connection.meta.limits.spam += 1;

      if (connection.meta.limits.spam < LIMITS_CHAT_SPAM_ATTEMPTS_TO_MUTE) {
        this.emit(RESPONSE_COMMAND_REPLY, connection.meta.id, "Don't spam!");
      } else {
        connection.meta.limits.spam = 0;
        this.emit(CHAT_MUTE_BY_SERVER, connection.meta.playerId);
      }
    }
  }
}
