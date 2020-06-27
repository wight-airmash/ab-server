import { BROADCAST_CHAT_SERVER_WHISPER, COMMAND_MATCH } from '../../../events';
import { System } from '../../../server/system';
import { unixMsToHumanReadable } from '../../../support/datetime';
import { ConnectionId } from '../../../types';

export default class MatchCommandHandler extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [COMMAND_MATCH]: this.onCommandReceived,
    };
  }

  onCommandReceived(connectionId: ConnectionId, command = ''): void {
    if (!this.storage.connectionList.has(connectionId)) {
      return;
    }

    const connection = this.storage.connectionList.get(connectionId);

    if (command === '') {
      this.emit(
        BROADCAST_CHAT_SERVER_WHISPER,
        connection.playerId,
        `Match time: ${unixMsToHumanReadable(this.storage.gameEntity.match.start)}.`
      );
    }
  }
}
