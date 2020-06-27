import { MAP_SIZE, SERVER_BOUNCE_DELAY_MS, SERVER_BOUNCE_MIN_SPEED } from '../../../constants';
import { PLAYERS_BOUNCE } from '../../../events';
import { PlayerId } from '../../../types';
import { System } from '../../system';

export default class GamePlayersBounce extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [PLAYERS_BOUNCE]: this.onBounce,
    };
  }

  /**
   * Bounce player from the mountain.
   *
   * @param playerId
   * @param mountainX mountain center X
   * @param mountainY mountain center Y
   */
  onBounce(playerId: PlayerId, mountainX: number, mountainY: number): void {
    const player = this.storage.playerList.get(playerId);
    const diffX = player.position.x + MAP_SIZE.HALF_WIDTH - mountainX;
    const diffY = player.position.y + MAP_SIZE.HALF_HEIGHT - mountainY;
    const angle = Math.atan2(diffY, diffX);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const now = Date.now();
    const timeDiff = now - player.times.lastBounce;

    player.times.lastBounce = now;

    {
      const velX = player.velocity.x;
      const velY = player.velocity.y;
      const bounceAngle = -Math.atan2(velY, velX);
      const bounceAngleSin = Math.sin(bounceAngle);
      const bounceAngleCos = Math.cos(bounceAngle);

      player.velocity.x = velX * bounceAngleCos - velY * bounceAngleSin;
      player.velocity.y = velX * bounceAngleSin + velY * bounceAngleCos;
    }

    const mul = SERVER_BOUNCE_DELAY_MS / (timeDiff === 0 ? SERVER_BOUNCE_DELAY_MS : timeDiff) / 3;

    if (Math.hypot(player.velocity.x, player.velocity.y) < SERVER_BOUNCE_MIN_SPEED) {
      player.velocity.x =
        (SERVER_BOUNCE_MIN_SPEED + mul) * cos - sin * (SERVER_BOUNCE_MIN_SPEED + mul);
      player.velocity.y =
        (SERVER_BOUNCE_MIN_SPEED + mul) * sin + cos * (SERVER_BOUNCE_MIN_SPEED + mul);
      player.velocity.isMin = false;
    } else {
      const velX = player.velocity.x;
      const velY = player.velocity.y;

      player.velocity.x = velX * cos - velY * sin + sin * mul;
      player.velocity.y = velX * sin + velY * cos - cos * mul;
    }
  }
}
