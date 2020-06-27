import { LIMITS_SPECTATE, LIMITS_SPECTATE_WEIGHT, SERVER_MIN_MOB_ID } from '../../constants';
import {
  COMMAND_SPECTATE,
  SPECTATE_ENTER_MODE,
  SPECTATE_NEXT,
  SPECTATE_PLAYER,
  SPECTATE_PREV,
} from '../../events';
import { CHANNEL_SPECTATE } from '../../events/channels';
import { MainConnectionId } from '../../types';
import { System } from '../system';

export default class SpectateCommandHandler extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [COMMAND_SPECTATE]: this.onCommandReceived,
    };
  }

  onCommandReceived(connectionId: MainConnectionId, commandArguments: string): void {
    if (!this.storage.connectionList.has(connectionId)) {
      return;
    }

    const spectateId = ~~commandArguments;
    const connection = this.storage.connectionList.get(connectionId);

    connection.limits.spectate += LIMITS_SPECTATE_WEIGHT;

    if (connection.limits.spectate > LIMITS_SPECTATE) {
      return;
    }

    if (
      !connection.pending.spectate &&
      ((spectateId > -4 && spectateId < 0) || spectateId >= SERVER_MIN_MOB_ID)
    ) {
      connection.pending.spectate = true;
    } else {
      return;
    }

    if (spectateId === -3) {
      this.channel(CHANNEL_SPECTATE).delay(SPECTATE_ENTER_MODE, connection.playerId);
    } else if (spectateId === -1) {
      this.channel(CHANNEL_SPECTATE).delay(SPECTATE_PREV, connection.playerId);
    } else if (spectateId === -2) {
      this.channel(CHANNEL_SPECTATE).delay(SPECTATE_NEXT, connection.playerId);
    } else {
      this.channel(CHANNEL_SPECTATE).delay(SPECTATE_PLAYER, connection.playerId, spectateId);
    }
  }
}
