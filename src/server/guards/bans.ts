import {
  CONNECTIONS_BAN_IP,
  CONNECTIONS_FLUSH_BANS,
  CONNECTIONS_UNBAN_IP,
  TIMELINE_CLOCK_DAY,
} from '../../events';
import { IPv4 } from '../../types';
import { System } from '../system';

export default class BansGuard extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [CONNECTIONS_BAN_IP]: this.onBan,
      [CONNECTIONS_FLUSH_BANS]: this.flushBans,
      [CONNECTIONS_UNBAN_IP]: this.onUnban,
      [TIMELINE_CLOCK_DAY]: this.clearExpired,
    };
  }

  /**
   * Ban by IP.
   *
   * @param ip
   * @param duration ms
   * @param reason
   */
  onBan(ip: IPv4, duration: number, reason: string): void {
    let ban = {
      reason,
      expire: Date.now() + duration,
    };

    if (this.storage.ipBanList.has(ip) && this.storage.ipBanList.get(ip).expire < ban.expire) {
      ban = this.storage.ipBanList.get(ip);
    }

    this.storage.ipBanList.set(ip, ban);

    this.log.info('Ban IP: %o', {
      ip,
      reason,
    });
  }

  onUnban(ip: IPv4): void {
    this.storage.ipBanList.delete(ip);

    this.log.info('Unban IP: %o', {
      ip,
    });
  }

  flushBans(): void {
    this.storage.ipBanList.forEach((ban, ip) => {
      this.onUnban(ip);
    });
  }

  clearExpired(): void {
    const now = Date.now();

    this.storage.ipBanList.forEach((ban, ip) => {
      if (ban.expire <= now) {
        this.onUnban(ip);
      }
    });
  }
}
