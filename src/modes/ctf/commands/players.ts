import { COMMAND_PLAYERS, PLAYERS_STATS_ANNOUNCE } from '../../../events';
import { CHANNEL_PLAYERS_STATS } from '../../../events/channels';
import { System } from '../../../server/system';
import { MainConnectionId } from '../../../types';

export default class PlayersCommandHandler extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [COMMAND_PLAYERS]: this.onCommandReceived,
    };
  }

  onCommandReceived(connectionId: MainConnectionId, command: string): void {
    if (!this.storage.connectionList.has(connectionId)) {
      return;
    }

    const connection = this.storage.connectionList.get(connectionId);

    this.channel(CHANNEL_PLAYERS_STATS).delay(PLAYERS_STATS_ANNOUNCE, connection.playerId, command);
  }
}
