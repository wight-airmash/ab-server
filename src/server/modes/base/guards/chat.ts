import {
  CHAT_CHECK_LIMITS,
  RESPONSE_VOTEMUTED,
  RESPONSE_COMMAND_REPLY,
  CHAT_MUTE_BY_SERVER,
  CHAT_UNMUTE_BY_IP,
  CHAT_MUTE_BY_IP,
} from '@/events';
import { System } from '@/server/system';
import { PlayerConnection, IPv4 } from '@/types';
import { LIMITS_CHAT_WEIGHT, LIMITS_CHAT, LIMITS_CHAT_SPAM_ATTEMPTS_TO_MUTE } from '@/constants';

export default class ChatGuard extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [CHAT_CHECK_LIMITS]: this.onCheckLimits,
      [CHAT_UNMUTE_BY_IP]: this.unmuteByIp,
      [CHAT_MUTE_BY_IP]: this.muteByIp,
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

  /**
   *
   * @param ip
   * @param expired ms.
   */
  protected updatePlayersMuteExpireTime(ip: IPv4, expired: number): void {
    if (!this.storage.connectionByIPList.has(ip)) {
      return;
    }

    const connectionIdList = this.storage.connectionByIPList.get(ip);

    connectionIdList.forEach(connectionId => {
      if (!this.storage.connectionList.has(connectionId)) {
        return;
      }

      const connection = this.storage.connectionList.get(connectionId);

      if (!this.storage.playerList.has(connection.meta.playerId)) {
        return;
      }

      const player = this.storage.playerList.get(connection.meta.playerId);

      player.times.unmuteTime = expired;
    });
  }

  unmuteByIp(ip: IPv4): void {
    const expired = Date.now() - 1;

    this.storage.ipMuteList.delete(ip);

    this.updatePlayersMuteExpireTime(ip, expired);
  }

  /**
   *
   * @param ip
   * @param duration ms.
   */
  muteByIp(ip: IPv4, duration: number): void {
    const expired = Date.now() + duration;

    this.storage.ipMuteList.set(ip, expired);

    this.updatePlayersMuteExpireTime(ip, expired);
  }
}
