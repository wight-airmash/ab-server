import { MOB_DESPAWN_TYPES } from '@airbattle/protocol';
import { MAP_COORDS, MAP_SIZE, PROJECTILES_SPECS } from '../../constants';
import {
  BROADCAST_MOB_DESPAWN,
  COLLISIONS_REMOVE_OBJECT,
  PROJECTILES_DELETE,
  PROJECTILES_UPDATE,
} from '../../events';
import { MobId, Projectile } from '../../types';
import { System } from '../system';

export default class GameProjectiles extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [PROJECTILES_UPDATE]: this.onUpdateProjectiles,
      [PROJECTILES_DELETE]: this.deleteProjectile,
    };
  }

  deleteProjectile(id: MobId): void {
    if (!this.storage.mobList.has(id)) {
      return;
    }

    const projectile = this.storage.mobList.get(id) as Projectile;

    this.emit(COLLISIONS_REMOVE_OBJECT, projectile.hitbox.current);

    this.storage.projectileIdList.delete(id);
    this.storage.mobList.delete(id);
    this.storage.mobIdList.delete(id);
  }

  onUpdateProjectiles(frame: number, frameFactor: number): void {
    const skippedFrames = Math.round(frameFactor);
    const lastFrameCompensationFactor = frameFactor - Math.floor(frameFactor) + 1;
    let compensationFactor = frameFactor / skippedFrames;

    const projectilesToDespawn = [];

    {
      const projectilesIterator = this.storage.projectileIdList.values();
      let projectileId: MobId = projectilesIterator.next().value;

      while (projectileId !== undefined) {
        const projectile = this.storage.mobList.get(projectileId) as Projectile;
        const PROJECTILE_PARAMS = PROJECTILES_SPECS[projectile.mobtype.current];

        for (let frameIndex = 1; frameIndex <= skippedFrames; frameIndex += 1) {
          compensationFactor = 1;

          if (frameIndex === skippedFrames) {
            compensationFactor = lastFrameCompensationFactor;
          }

          const prevSpeedX = projectile.velocity.x;
          const prevSpeedY = projectile.velocity.y;

          projectile.velocity.x += projectile.acceleration.x * compensationFactor;
          projectile.velocity.y += projectile.acceleration.y * compensationFactor;
          projectile.repel.current = false;

          const speed = Math.hypot(projectile.velocity.x, projectile.velocity.y);

          if (speed > projectile.velocity.max) {
            projectile.velocity.x *= projectile.velocity.max / speed;
            projectile.velocity.y *= projectile.velocity.max / speed;
            projectile.velocity.length = projectile.velocity.max;
          } else {
            projectile.velocity.length = speed;
          }

          projectile.position.x +=
            (prevSpeedX + 0.5 * (projectile.velocity.x - prevSpeedX)) * compensationFactor;
          projectile.position.y +=
            (prevSpeedY + 0.5 * (projectile.velocity.y - prevSpeedY)) * compensationFactor;

          projectile.distance.current += Math.hypot(projectile.velocity.x, projectile.velocity.y);

          if (
            projectile.damage.double &&
            projectile.damage.doubleEnd <= projectile.distance.current
          ) {
            projectile.damage.double = false;
          }

          if (
            projectile.distance.current >= PROJECTILE_PARAMS.distance ||
            projectile.position.x < MAP_COORDS.MIN_X ||
            projectile.position.x > MAP_COORDS.MAX_X ||
            projectile.position.y < MAP_COORDS.MIN_Y ||
            projectile.position.y > MAP_COORDS.MAX_Y
          ) {
            projectilesToDespawn.push(projectile.id.current);
          } else {
            /**
             * Actually rotation never changes, it doesn't need to get hitbox from cache.
             * TODO: cache it.
             */
            const hitboxCache =
              this.storage.projectileHitboxesCache[PROJECTILE_PARAMS.shape][
                projectile.rotation.low
              ];

            projectile.hitbox.x = ~~projectile.position.x + MAP_SIZE.HALF_WIDTH + hitboxCache.x;
            projectile.hitbox.y = ~~projectile.position.y + MAP_SIZE.HALF_HEIGHT + hitboxCache.y;

            projectile.hitbox.current.x = projectile.hitbox.x - hitboxCache.x;
            projectile.hitbox.current.y = projectile.hitbox.y - hitboxCache.y;
          }
        }

        projectileId = projectilesIterator.next().value;
      }
    }

    /**
     * Despawn projectiles.
     */
    for (let index = 0; index < projectilesToDespawn.length; index += 1) {
      this.despawnProjectile(projectilesToDespawn[index]);
    }

    this.emitDelayed();
  }

  private despawnProjectile(id: number): void {
    this.deleteProjectile(id);
    this.delay(BROADCAST_MOB_DESPAWN, id, MOB_DESPAWN_TYPES.EXPIRED);
  }
}
