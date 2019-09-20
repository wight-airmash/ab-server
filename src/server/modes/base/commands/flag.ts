import { COMMAND_FLAG, PLAYERS_UPDATE_FLAG } from '@/events';
import { System } from '@/server/system';
import { CHANNEL_UPDATE_PLAYER_FLAG } from '@/server/channels';
import { MainConnectionId } from '@/types';

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

    this.log.debug(`Player id${connection.meta.playerId} changed flag to ${flagIso}.`);

    this.channel(CHANNEL_UPDATE_PLAYER_FLAG).delay(
      PLAYERS_UPDATE_FLAG,
      connection.meta.playerId,
      flagIso
    );
  }
}
