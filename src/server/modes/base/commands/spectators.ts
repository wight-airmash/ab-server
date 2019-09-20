import { COMMAND_SPECTATORS, BROADCAST_CHAT_SERVER_WHISPER } from '@/events';
import { System } from '@/server/system';
import { MainConnectionId } from '@/types';

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

    if (!this.helpers.isPlayerConnected(connection.meta.playerId)) {
      return;
    }

    const viewport = this.storage.viewportList.get(connection.meta.playerId);

    this.emit(
      BROADCAST_CHAT_SERVER_WHISPER,
      connection.meta.playerId,
      `Watching you: ${viewport.subs.size}.`
    );
  }
}
