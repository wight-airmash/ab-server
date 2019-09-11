import { System } from '@/server/system';
import { TIMELINE_CLOCK_MINUTE } from '@/events';

export default class Recovering extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [TIMELINE_CLOCK_MINUTE]: this.clearExpired,
    };
  }

  clearExpired(): void {
    const now = Date.now();
    const ids = [...this.storage.playerRecoverList.keys()];

    this.log.debug(`Recovering clean start, items: ${this.storage.playerRecoverList.size}`);

    for (let index = 0; index < ids.length; index += 1) {
      const recover = this.storage.playerRecoverList.get(ids[index]);

      if (recover.expired < now) {
        this.storage.playerRecoverList.delete(ids[index]);
      }
    }

    this.log.debug(`Recovering clean finished, items: ${this.storage.playerRecoverList.size}`);
  }
}
