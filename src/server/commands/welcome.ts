import { CHAT_WELCOME, COMMAND_WELCOME } from '../../events';
import { CHANNEL_CHAT } from '../../events/channels';
import { MainConnectionId } from '../../types';
import { System } from '../system';

export default class WelcomeCommandHandler extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [COMMAND_WELCOME]: this.onCommandReceived,
    };
  }

  onCommandReceived(connectionId: MainConnectionId): void {
    if (!this.storage.connectionList.has(connectionId)) {
      return;
    }

    const connection = this.storage.connectionList.get(connectionId);

    this.channel(CHANNEL_CHAT).delay(CHAT_WELCOME, connection.playerId);
  }
}
