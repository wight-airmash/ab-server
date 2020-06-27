import { PLAYERS_ID_CACHE_LIFETIME_MS } from '../../constants';
import { TIMELINE_CLOCK_HOUR } from '../../events';
import { System } from '../system';

export default class MobIdStorageOptimizer extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [TIMELINE_CLOCK_HOUR]: this.clearExpiredPlayerIds,
    };
  }

  clearExpiredPlayerIds(): void {
    const limit = Date.now() - PLAYERS_ID_CACHE_LIFETIME_MS;

    this.storage.playerHistoryNameToIdList.forEach(({ id, expired }, playerName: string) => {
      if (expired <= limit && !this.storage.mobIdList.has(id)) {
        this.storage.playerHistoryNameToIdList.delete(playerName);
      }
    });
  }
}
