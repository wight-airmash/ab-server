import { BROADCAST_CHAT_SERVER_WHISPER, COMMAND_PLAYERS } from '../../events';
import { ConnectionId } from '../../types';
import { System } from '../system';

export default class PlayersCommandHandler extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [COMMAND_PLAYERS]: this.onCommandReceived,
    };
  }

  onCommandReceived(connectionId: ConnectionId): void {
    const connection = this.storage.connectionList.get(connectionId);

    if (
      !this.storage.connectionList.has(connectionId) ||
      !this.helpers.isPlayerConnected(connection.playerId)
    ) {
      return;
    }

    const playersTotal = this.storage.playerList.size;
    const playersInSpec = this.storage.playerInSpecModeList.size;
    const playersActive = playersTotal - playersInSpec;
    const bots = this.storage.botIdList.size;
    const humans = playersTotal - bots;

    this.emit(
      BROADCAST_CHAT_SERVER_WHISPER,
      connection.playerId,
      [
        `Players: ${playersActive} active, ${playersInSpec} in spectate mode, `,
        `${humans} human${humans === 1 ? '' : 's'} and ${bots} bot${bots === 1 ? '' : 's'}.`,
      ].join('')
    );
  }
}
