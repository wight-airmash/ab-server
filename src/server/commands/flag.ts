import { COMMAND_FLAG, PLAYERS_UPDATE_FLAG } from '../../events';
import { CHANNEL_UPDATE_PLAYER_FLAG } from '../../events/channels';
import { MainConnectionId } from '../../types';
import { System } from '../system';

export default class FlagCommandHandler extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [COMMAND_FLAG]: this.onCommandReceived,
    };
  }

  onCommandReceived(connectionId: MainConnectionId, flagIso: string): void {
    if (!this.storage.connectionList.has(connectionId)) {
      return;
    }

    const connection = this.storage.connectionList.get(connectionId);

    this.channel(CHANNEL_UPDATE_PLAYER_FLAG).delay(
      PLAYERS_UPDATE_FLAG,
      connection.playerId,
      flagIso
    );
  }
}
