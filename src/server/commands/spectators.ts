import { BROADCAST_CHAT_SERVER_WHISPER, COMMAND_SPECTATORS } from '../../events';
import { MainConnectionId } from '../../types';
import { System } from '../system';

export default class SpectatorsCommandHandler extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [COMMAND_SPECTATORS]: this.onCommandReceived,
    };
  }

  onCommandReceived(connectionId: MainConnectionId): void {
    if (!this.storage.connectionList.has(connectionId)) {
      return;
    }

    const connection = this.storage.connectionList.get(connectionId);

    if (!this.helpers.isPlayerConnected(connection.playerId)) {
      return;
    }

    const viewport = this.storage.viewportList.get(connection.playerId);

    this.emit(
      BROADCAST_CHAT_SERVER_WHISPER,
      connection.playerId,
      `Watching you: ${viewport.subs.size}.`
    );
  }
}
