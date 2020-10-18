import { ServerPackets, SERVER_MESSAGE_TYPES, SERVER_PACKETS } from '@airbattle/protocol';
import { MS_PER_SEC } from '../../constants';
import { CONNECTIONS_SEND_PACKETS, RESPONSE_KILL_ASSIST } from '../../events';
import { escapeHTML } from '../../support/strings';
import { PlayerId, PlayerName } from '../../types';
import { System } from '../system';

export default class KillAssistResponse extends System {
  private readonly messageDuration = 3 * MS_PER_SEC;

  constructor({ app }) {
    super({ app });

    this.listeners = {
      [RESPONSE_KILL_ASSIST]: this.onKillAssist,
    };
  }

  /**
   * Show an alert about assisting.
   */
  onKillAssist(playerId: PlayerId, victimName: PlayerName): void {
    if (!this.storage.playerMainConnectionList.has(playerId)) {
      return;
    }

    this.emit(
      CONNECTIONS_SEND_PACKETS,
      {
        c: SERVER_PACKETS.SERVER_MESSAGE,
        type: SERVER_MESSAGE_TYPES.INFO,
        duration: this.messageDuration,
        text: `Assisted in killing ${escapeHTML(victimName)}`,
      } as ServerPackets.ServerMessage,
      this.storage.playerMainConnectionList.get(playerId)
    );
  }
}
