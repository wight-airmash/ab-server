import { MAP_SIZE } from '@/constants';
import { BROADCAST_CHAT_SERVER_WHISPER, COMMAND_HORIZON } from '@/events';
import { System } from '@/server/system';
import { MainConnectionId } from '@/types';

export default class HorizonCommandHandler extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [COMMAND_HORIZON]: this.onCommandReceived,
    };
  }

  onCommandReceived(connectionId: MainConnectionId): void {
    if (!this.storage.connectionList.has(connectionId)) {
      return;
    }

    const connection = this.storage.connectionList.get(connectionId);
    const { playerId } = connection.meta;

    if (!this.helpers.isPlayerConnected(playerId)) {
      return;
    }

    const player = this.storage.playerList.get(playerId);
    let viewportHorizonX = 0;
    let viewportHorizonY = 0;
    let viewportX = 0;
    let viewportY = 0;

    if (this.storage.viewportList.has(playerId)) {
      const viewport = this.storage.viewportList.get(playerId);

      ({ horizonX: viewportHorizonX, horizonY: viewportHorizonY } = viewport);

      viewportX = viewport.hitbox.x - MAP_SIZE.HALF_WIDTH;
      viewportY = viewport.hitbox.y - MAP_SIZE.HALF_HEIGHT;
    }

    this.emit(
      BROADCAST_CHAT_SERVER_WHISPER,
      playerId,
      [
        `Position (${~~player.position.x}, ${~~player.position.y}).`,
        `Horizon original (${player.horizon.x}, ${player.horizon.y}), valid (${player.horizon.validX}, ${player.horizon.validY}).`,
        `Viewport horizon (${viewportHorizonX}, ${viewportHorizonY}), position (${viewportX}, ${viewportY}).`,
      ].join(' ')
    );
  }
}
