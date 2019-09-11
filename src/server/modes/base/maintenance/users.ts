import { System } from '@/server/system';
import { PLAYERS_CREATE } from '@/events';

export default class GameUsers extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [PLAYERS_CREATE]: this.onCreatePlayer,
    };
  }

  onCreatePlayer({ id, user }): void {
    if (user !== false) {
      const player = this.storage.playerList.get(id);

      player.level.current = user.level;
      player.earningscore.current = user.earnings;
      player.kills.total = user.kills;
      player.deaths.total = user.deaths;
    }
  }
}
