import { GAME_TYPES } from '@airbattle/protocol';
import { SECONDS_PER_DAY, SECONDS_PER_HOUR, SECONDS_PER_MINUTE } from '../../constants';
import { BROADCAST_CHAT_SERVER_WHISPER, COMMAND_LAGS } from '../../events';
import { msToHumanReadable } from '../../support/datetime';
import { ConnectionId } from '../../types';
import { System } from '../system';

export default class LagsCommandHandler extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [COMMAND_LAGS]: this.onCommandReceived,
    };
  }

  onCommandReceived(connectionId: ConnectionId): void {
    if (!this.storage.connectionList.has(connectionId)) {
      return;
    }

    const connection = this.storage.connectionList.get(connectionId);

    if (this.helpers.isPlayerConnected(connection.playerId)) {
      const now = Date.now();
      const response = [];

      if (connection.lagging.detects === 0) {
        response.push("The server didn't detect any lags over 1.5s from your side. ");
      } else {
        response.push(
          `The server's detected lags over 1.5s on your side ${connection.lagging.detects} time`
        );

        if (connection.lagging.detects === 1) {
          response.push('. ');
        } else {
          response.push('s. ');
        }

        const lastLagText = `The last one was ${msToHumanReadable(
          now - connection.lagging.lastAt
        )} ago`;

        if (connection.lagging.isActive) {
          response.push(`${lastLagText}. `);
        } else {
          let lagDurationText = '';

          if (connection.lagging.lastDuration > 999) {
            lagDurationText = `${connection.lagging.lastDuration / 1000} s`;
          } else {
            lagDurationText = `${connection.lagging.lastDuration} ms`;
          }

          response.push(`${lastLagText} and lasted ${lagDurationText}. `);
        }
      }

      if (this.config.server.typeId !== GAME_TYPES.FFA) {
        if (this.app.metrics.frames.skippedDuringMatch === 0) {
          response.push("The server didn't skip any frames during this match. ");
        } else {
          response.push(
            `During this match the server skipped ${this.app.metrics.frames.skippedDuringMatch} frame`
          );

          if (this.app.metrics.frames.skippedDuringMatch === 1) {
            response.push('. ');
          } else {
            response.push('s. ');
          }
        }
      }

      if (this.app.metrics.lastSample.sft !== 0) {
        response.push(
          `The last server frame skip was ${msToHumanReadable(
            now - this.app.metrics.frames.skippedAt
          )} ago. `
        );

        const ratio = this.app.metrics.uptime.seconds / this.app.metrics.lastSample.sft;
        let measure = '';

        let skipRate =
          this.app.metrics.lastSample.sft / Math.max(this.app.metrics.uptime.seconds, 1);

        if (ratio <= SECONDS_PER_MINUTE || this.app.metrics.uptime.seconds < SECONDS_PER_HOUR) {
          measure = 'minute';
          skipRate *= SECONDS_PER_MINUTE;
        } else if (ratio <= SECONDS_PER_HOUR || this.app.metrics.uptime.seconds < SECONDS_PER_DAY) {
          measure = 'hour';
          skipRate *= SECONDS_PER_HOUR;
        } else {
          measure = 'day';
          skipRate *= SECONDS_PER_DAY;
        }

        skipRate = ~~(skipRate * 100) / 100;

        response.push(`Skip rate: ${skipRate} fr/${measure}.`);
      }

      this.emit(BROADCAST_CHAT_SERVER_WHISPER, connection.playerId, response.join(''));
    }
  }
}
