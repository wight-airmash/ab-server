import {
  CONNECTIONS_BAN_IP,
  CONNECTIONS_FLUSH_BANS,
  CONNECTIONS_UNBAN_IP,
  TIMELINE_CLOCK_DAY,
} from '@/events';
import { System } from '@/server/system';
import { IPv4 } from '@/types';

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

    this.log.info(`IP ${ip} banned. Reason: "${reason}"`);
  }

  onUnban(ip: IPv4): void {
    this.storage.ipBanList.delete(ip);

    this.log.info('IP ban removed.', {
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

    this.log.debug(`IP bans clear start. Items: ${this.storage.ipBanList.size}.`);

    this.storage.ipBanList.forEach((ban, ip) => {
      if (ban.expire <= now) {
        this.onUnban(ip);
      }
    });

    this.log.debug(`IP bans clear end. Items: ${this.storage.ipBanList.size}.`);
  }
}
