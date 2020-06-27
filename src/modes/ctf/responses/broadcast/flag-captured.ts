import { CTF_TEAMS, SERVER_MESSAGE_TYPES } from '@airbattle/protocol';
import { MS_PER_SEC } from '../../../../constants';
import { BROADCAST_FLAG_CAPTURED, BROADCAST_SERVER_MESSAGE } from '../../../../events';
import { System } from '../../../../server/system';
import { escapeHTML } from '../../../../support/strings';
import { PlayerName } from '../../../../types';

export default class FlagCapturedBroadcast extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [BROADCAST_FLAG_CAPTURED]: this.onFlagCaptured,
    };
  }

  onFlagCaptured(flagType: CTF_TEAMS, playerName: PlayerName): void {
    this.emit(
      BROADCAST_SERVER_MESSAGE,
      `<span class="info inline"><span class="${
        flagType === CTF_TEAMS.BLUE ? 'blueflag' : 'redflag'
      }"></span></span>Captured by ${escapeHTML(playerName)}`,
      SERVER_MESSAGE_TYPES.INFO,
      3 * MS_PER_SEC
    );
  }
}
