import { MS_PER_SEC, SERVER_FPS } from '../../constants';
import { BROADCAST_CHAT_SERVER_WHISPER, COMMAND_PROFILE } from '../../events';
import { msToHumanReadable, unixMsToHumanReadable } from '../../support/datetime';
import { ConnectionId } from '../../types';
import { System } from '../system';

export default class ProfileCommandHandler extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [COMMAND_PROFILE]: this.onCommandReceived,
    };
  }

  onCommandReceived(connectionId: ConnectionId, command = ''): void {
    if (!this.storage.connectionList.has(connectionId)) {
      return;
    }

    const connection = this.storage.connectionList.get(connectionId);

    if (this.helpers.isPlayerConnected(connection.playerId) && command === '') {
      const now = Date.now();
      const player = this.storage.playerList.get(connection.playerId);
      const stats = [`Connected: ${unixMsToHumanReadable(player.times.createdAt, now)} ago.`];
      const afkMs = now - player.times.lastMove;
      const frameMs = 1000 / SERVER_FPS;
      const afkTotalMs = Math.floor((player.times.inactiveTotal / 17) * frameMs);
      const playingMs = Math.floor((player.times.activePlaying / 17) * frameMs);

      let playTimeMsg = `Playing: ${msToHumanReadable(playingMs)}, AFK: ${msToHumanReadable(
        afkTotalMs
      )}`;

      if (afkMs > 10 * MS_PER_SEC) {
        playTimeMsg += ` total and ${msToHumanReadable(afkMs)} since the last playing.`;
      } else {
        playTimeMsg += '.';
      }

      stats.push(playTimeMsg);
      stats.push(`${player.keystate.presses.total} keys pressed.`);

      stats.push(
        `Picked up ${player.shield.collected} shields, ${player.inferno.collected} infernos, ${player.upgrades.collected} upgrades and ${player.upgrades.used} used.`
      );

      stats.push(
        `Fired ${player.stats.fireProjectiles} missiles and killed ${player.kills.bots} bots.`
      );

      this.emit(BROADCAST_CHAT_SERVER_WHISPER, connection.playerId, stats.join(' '));
    }
  }
}
