import { Collisions } from 'collisions';
import {
  COLLISIONS_OBJECT_TYPES,
  PLAYERS_ALIVE_STATUSES,
  PLAYERS_HEALTH,
  POWERUPS_DEFAULT_DURATION_MS,
  SERVER_BOUNCE_DELAY_MS,
  SERVER_MIN_MOB_ID,
  UPGRADES_OWNER_INACTIVITY_TIMEOUT_MS,
} from '@/constants';
import {
  COLLISIONS_ADD_OBJECT,
  BROADCAST_EVENT_BOUNCE,
  BROADCAST_EVENT_REPEL,
  BROADCAST_MOB_DESPAWN_COORDS,
  BROADCAST_MOB_UPDATE,
  BROADCAST_MOB_UPDATE_STATIONARY,
  BROADCAST_PLAYER_HIT,
  BROADCAST_PLAYER_UPDATE,
  PROJECTILES_DELETE,
  COLLISIONS_DETECT,
  PLAYERS_APPLY_INFERNO,
  PLAYERS_APPLY_SHIELD,
  PLAYERS_BOUNCE,
  PLAYERS_HIT,
  PLAYERS_KILL,
  CTF_PLAYER_CROSSED_FLAGZONE,
  CTF_PLAYER_TOUCHED_FLAG,
  POWERUPS_DESPAWN,
  POWERUPS_PICKED,
  COLLISIONS_REMOVE_OBJECT,
  PLAYERS_REPEL_MOBS,
  RESPONSE_EVENT_LEAVE_HORIZON,
  RESPONSE_SCORE_UPDATE,
  TIMELINE_BEFORE_GAME_START,
} from '@/events';
import Entity from '@/server/entity';
import { System } from '@/server/system';
import { has } from '@/support/objects';
import { ConnectionId, MainConnectionId, MobId } from '@/types';

const isBox = (mobType: number): boolean => {
  return (
    mobType === COLLISIONS_OBJECT_TYPES.INFERNO ||
    mobType === COLLISIONS_OBJECT_TYPES.SHIELD ||
    mobType === COLLISIONS_OBJECT_TYPES.UPGRADE
  );
};

const addViewer = (storage: any, mobId: MobId, viewer: ConnectionId): void => {
  if (storage.has(mobId)) {
    storage.get(mobId).add(viewer);
  } else {
    storage.set(mobId, new Set([viewer]));
  }
};

export default class GameCollisions extends System {
  private now: number;

  constructor({ app }) {
    super({ app });

    this.listeners = {
      [TIMELINE_BEFORE_GAME_START]: this.initDetector,
      [COLLISIONS_ADD_OBJECT]: this.onAddToCollisionDetector,
      [COLLISIONS_REMOVE_OBJECT]: this.onRemoveFromCollisionDetector,
      [COLLISIONS_DETECT]: this.onDetectCollisions,
    };
  }

  initDetector(): void {
    this.app.detector = new Collisions();
  }

  protected isPowerupExpired(powerupId: MobId): boolean {
    const powerup = this.storage.mobList.get(powerupId);

    if (!powerup || (powerup.despawn.permanent === false && powerup.despawn.time <= this.now)) {
      return true;
    }

    return false;
  }

  onAddToCollisionDetector(body: any): void {
    this.app.detector.insert(body);
  }

  onRemoveFromCollisionDetector(body: any): void {
    this.app.detector.remove(body);
  }

  onDetectCollisions(): void {
    this.now = Date.now();

    const broadcast: Map<MobId, Set<MainConnectionId>> = new Map();

    /**
     * Boxes to be destroyed.
     */
    const inactiveBoxes: Set<MobId> = new Set();

    /**
     * All projectiles that need to be checked for collisions.
     */
    const projectiles: Set<MobId> = new Set();

    /**
     * Update collisions layer.
     */
    this.app.detector.update();

    this.storage.viewportList.forEach((viewport, playerId) => {
      if (!this.storage.playerMainConnectionList.has(playerId)) {
        return;
      }

      const connectionId = this.storage.playerMainConnectionList.get(playerId);

      viewport.joined.clear();
      viewport.leaved = new Set(viewport.current);
      viewport.current.clear();

      /**
       * Player always sees itself.
       */
      addViewer(broadcast, playerId, connectionId);

      /**
       * Potential collisions.
       */
      const visibleObjects = viewport.hitbox.potentials();

      for (let index = 0; index < visibleObjects.length; index += 1) {
        const { type, id } = visibleObjects[index];

        /**
         * Fast visibility check.
         * Also don't need to check objects already checked.
         */
        if (
          id < SERVER_MIN_MOB_ID ||
          id === playerId ||
          viewport.joined.has(id) ||
          viewport.current.has(id) ||
          !(
            isBox(type) ||
            type === COLLISIONS_OBJECT_TYPES.PROJECTILE ||
            type === COLLISIONS_OBJECT_TYPES.PLAYER
          )
        ) {
          // eslint-disable-next-line no-continue
          continue;
        }

        viewport.current.add(id);

        /**
         * Mark the player as a viewer of the mob.
         */
        addViewer(broadcast, id, connectionId);

        /**
         * Collect projectile ids. It will need later to not to check
         * each projectile.
         */
        if (type === COLLISIONS_OBJECT_TYPES.PROJECTILE) {
          projectiles.add(id);
        }

        if (!viewport.leaved.has(id)) {
          /**
           * New mobs branch.
           */

          viewport.joined.add(id);

          /**
           * List of the boxes which needed to despawn.
           */
          if (isBox(type) && this.isPowerupExpired(id)) {
            inactiveBoxes.add(id);
          }

          if (type === COLLISIONS_OBJECT_TYPES.PROJECTILE) {
            this.delay(BROADCAST_MOB_UPDATE, id, playerId);
          } else if (isBox(type) && !inactiveBoxes.has(id)) {
            this.delay(BROADCAST_MOB_UPDATE_STATIONARY, id, playerId);
          } else if (type === COLLISIONS_OBJECT_TYPES.PLAYER) {
            this.delay(BROADCAST_PLAYER_UPDATE, id, playerId);
          }
        } else {
          /**
           * Old mobs branch.
           */
          viewport.leaved.delete(id);
        }
      }

      /**
       * Now in `viewport.leaved` are all the mobs, which were visible
       * to the player on the previous tick, but not on this tick.
       */
      this.delay(RESPONSE_EVENT_LEAVE_HORIZON, connectionId, viewport.leaved);
    });

    /**
     * Despawn outdated boxes.
     */
    inactiveBoxes.forEach(boxId => {
      this.delay(POWERUPS_DESPAWN, boxId);
    });

    this.storage.broadcast = broadcast;

    this.emitDelayed();

    /**
     * Players collisions.
     */
    this.storage.playerList.forEach(player => {
      if (player.alivestatus.current !== PLAYERS_ALIVE_STATUSES.ALIVE) {
        return;
      }

      /**
       * Handle repel special.
       */
      if (player.planestate.repel === true) {
        const repel = this.storage.repelList.get(player.id.current);

        const collisions = repel.hitbox.current.potentials();
        const repelProjectiles = [];
        const repelPlayers = [];

        for (let ci = 0; ci < collisions.length; ci += 1) {
          const mobHitbox = collisions[ci];
          const { id, type } = mobHitbox;

          if (
            id !== player.id.current &&
            (type === COLLISIONS_OBJECT_TYPES.PLAYER ||
              type === COLLISIONS_OBJECT_TYPES.PROJECTILE) &&
            this.checkRepelCollisions(repel, id)
          ) {
            if (type === COLLISIONS_OBJECT_TYPES.PLAYER) {
              repelPlayers.push(id);
            } else {
              repelProjectiles.push(id);
            }
          }
        }

        this.emit(PLAYERS_REPEL_MOBS, player, repelPlayers, repelProjectiles);
        this.emit(BROADCAST_EVENT_REPEL, player.id.current, repelPlayers, repelProjectiles);
        this.emitDelayed();
      }

      /**
       * Handle player collisions.
       */
      const collisions = player.hitbox.current.potentials();

      if (collisions.length > 0) {
        collisions.sort((a: any, b: any) => a.type - b.type);

        for (let ci = 0; ci < collisions.length; ci += 1) {
          const mobHitbox = collisions[ci];
          const { id, type } = mobHitbox;

          if (
            player.alivestatus.current === PLAYERS_ALIVE_STATUSES.ALIVE &&
            id !== player.id.current &&
            type !== COLLISIONS_OBJECT_TYPES.VIEWPORT &&
            this.checkPlayerCollisions(player, id)
          ) {
            if (
              type === COLLISIONS_OBJECT_TYPES.MOUNTAIN &&
              player.times.lastBounce < this.now - SERVER_BOUNCE_DELAY_MS
            ) {
              this.emit(
                PLAYERS_BOUNCE,
                player.id.current,
                mobHitbox.x,
                mobHitbox.y,
                mobHitbox.radius
              );
              this.delay(BROADCAST_EVENT_BOUNCE, player.id.current);
            } else if (isBox(type) && !inactiveBoxes.has(id)) {
              if (type === COLLISIONS_OBJECT_TYPES.UPGRADE) {
                const box = this.storage.mobList.get(id);

                if (
                  box.owner.current === player.id.current &&
                  box.owner.lastDrop > this.now - UPGRADES_OWNER_INACTIVITY_TIMEOUT_MS
                ) {
                  return;
                }
              }

              inactiveBoxes.add(id);
              this.delay(POWERUPS_PICKED, id, player.id.current);

              if (type === COLLISIONS_OBJECT_TYPES.INFERNO) {
                this.delay(PLAYERS_APPLY_INFERNO, player.id.current, POWERUPS_DEFAULT_DURATION_MS);
              } else if (type === COLLISIONS_OBJECT_TYPES.SHIELD) {
                this.delay(PLAYERS_APPLY_SHIELD, player.id.current, POWERUPS_DEFAULT_DURATION_MS);
              } else {
                player.upgrades.amount += 1;

                if (!player.delayed.RESPONSE_SCORE_UPDATE) {
                  player.delayed.RESPONSE_SCORE_UPDATE = true;
                  this.delay(RESPONSE_SCORE_UPDATE, player.id.current);
                }
              }
            } else if (type === COLLISIONS_OBJECT_TYPES.FLAG) {
              this.emit(CTF_PLAYER_TOUCHED_FLAG, player.id.current, id);
            } else if (type === COLLISIONS_OBJECT_TYPES.FLAGZONE) {
              this.emit(CTF_PLAYER_CROSSED_FLAGZONE, player.id.current, id);
            } else if (type === COLLISIONS_OBJECT_TYPES.PROJECTILE && projectiles.has(id)) {
              if (player.health.current === PLAYERS_HEALTH.MIN) {
                return;
              }

              /**
               * Projectile is destroyed, don't need to check it later.
               */
              projectiles.delete(id);

              this.emit(PLAYERS_HIT, player.id.current, id);
              this.delay(BROADCAST_PLAYER_HIT, id, [player.id.current]);

              if (player.health.current === PLAYERS_HEALTH.MIN) {
                this.emit(PLAYERS_KILL, player.id.current, id);

                if (!player.delayed.RESPONSE_SCORE_UPDATE) {
                  player.delayed.RESPONSE_SCORE_UPDATE = true;
                  this.delay(RESPONSE_SCORE_UPDATE, player.id.current);
                }

                const projectile = this.storage.mobList.get(id);

                if (this.storage.playerList.has(projectile.owner.current)) {
                  const enemy = this.storage.playerList.get(projectile.owner.current);

                  if (!enemy.delayed.RESPONSE_SCORE_UPDATE) {
                    enemy.delayed.RESPONSE_SCORE_UPDATE = true;
                    this.delay(RESPONSE_SCORE_UPDATE, projectile.owner.current);
                  }
                }

                // break; ?
              }

              this.delay(PROJECTILES_DELETE, id);
            }
          }
        }
      }
    });

    this.emitDelayed();

    /**
     * Actually all the projectiles should be checked,
     * but with a large scale factor limit (like default 5500)
     * it doesn't matter.
     *
     * If you use a small SF limit, you need to change this code,
     * otherwise you will get projectiles sometimes fly through mountains.
     */
    projectiles.forEach(projectileId => {
      const projectile = this.storage.mobList.get(projectileId);

      const collisions = projectile.hitbox.current.potentials();

      if (collisions.length > 0) {
        for (let ci = 0; ci < collisions.length; ci += 1) {
          if (
            collisions[ci].type === COLLISIONS_OBJECT_TYPES.MOUNTAIN &&
            this.checkProjectileToMountainCollision(projectile, collisions[ci].id)
          ) {
            this.emit(
              BROADCAST_MOB_DESPAWN_COORDS,
              projectileId,
              projectile.position.x,
              projectile.position.y,
              projectile.mobtype.current
            );
            this.delay(PROJECTILES_DELETE, projectileId);
          }
        }
      }
    });

    this.emitDelayed();
  }

  protected checkProjectileToMountainCollision(projectile: Entity, mountainId: MobId): boolean {
    const mountain = this.storage.mobList.get(mountainId);
    let hasCollision = false;

    if (
      projectile.hitbox.x >= mountain.hitbox.x + mountain.hitbox.width ||
      projectile.hitbox.x + projectile.hitbox.width <= mountain.hitbox.x ||
      projectile.hitbox.y >= mountain.hitbox.y + mountain.hitbox.height ||
      projectile.hitbox.y + projectile.hitbox.height <= mountain.hitbox.y
    ) {
      return hasCollision;
    }

    /**
     * Check only forward projectile hitcircle.
     */
    const mountainX =
      mountain.position.x +
      mountain.hitcircles.current[0][0] * mountain.rotation.cos -
      mountain.hitcircles.current[0][1] * mountain.rotation.sin;
    const mountainY =
      mountain.position.y +
      mountain.hitcircles.current[0][0] * mountain.rotation.sin +
      mountain.hitcircles.current[0][1] * mountain.rotation.cos;
    const mountainR = mountain.hitcircles.current[0][2];

    /**
     * TODO: optimization is needed, cache the values.
     */
    const projectileX =
      projectile.position.x +
      projectile.hitcircles.current[0][0] * projectile.rotation.cos -
      projectile.hitcircles.current[0][1] * projectile.rotation.sin;
    const projectileY =
      projectile.position.y +
      projectile.hitcircles.current[0][0] * projectile.rotation.sin +
      projectile.hitcircles.current[0][1] * projectile.rotation.cos;
    const projectileR = projectile.hitcircles.current[0][2];

    const distSq =
      (projectileX - mountainX) * (projectileX - mountainX) +
      (projectileY - mountainY) * (projectileY - mountainY);
    const radSumSq = (projectileR + mountainR) * (projectileR + mountainR);

    if (distSq < radSumSq) {
      hasCollision = true;
    }

    return hasCollision;
  }

  protected checkPlayerCollisions(player: Entity, mobId: MobId): boolean {
    const mob = this.storage.mobList.get(mobId);
    let hasCollision = false;

    if (!mob) {
      return hasCollision;
    }

    if (
      mob.hitbox.current.type !== COLLISIONS_OBJECT_TYPES.FLAG &&
      mob.hitbox.current.type !== COLLISIONS_OBJECT_TYPES.FLAGZONE &&
      has(mob, 'team') &&
      player.team.current === mob.team.current
    ) {
      return hasCollision;
    }

    if (
      player.hitbox.x >= mob.hitbox.x + mob.hitbox.width ||
      player.hitbox.x + player.hitbox.width <= mob.hitbox.x ||
      player.hitbox.y >= mob.hitbox.y + mob.hitbox.height ||
      player.hitbox.y + player.hitbox.height <= mob.hitbox.y
    ) {
      return hasCollision;
    }

    if (mob.hitbox.current.type !== COLLISIONS_OBJECT_TYPES.FLAGZONE) {
      for (let i = mob.hitcircles.current.length - 1; i !== -1; i -= 1) {
        if (hasCollision) {
          break;
        }

        const mobX =
          mob.position.x +
          mob.hitcircles.current[i][0] * mob.rotation.cos -
          mob.hitcircles.current[i][1] * mob.rotation.sin;
        const mobY =
          mob.position.y +
          mob.hitcircles.current[i][0] * mob.rotation.sin +
          mob.hitcircles.current[i][1] * mob.rotation.cos;
        const mobR = mob.hitcircles.current[i][2];

        /**
         * TODO: optimization is needed, cache the values.
         */
        for (let j = player.hitcircles.current.length - 1; j !== -1; j -= 1) {
          const playerX =
            player.position.x +
            player.hitcircles.current[j][0] * player.rotation.cos -
            player.hitcircles.current[j][1] * player.rotation.sin;
          const playerY =
            player.position.y +
            player.hitcircles.current[j][0] * player.rotation.sin +
            player.hitcircles.current[j][1] * player.rotation.cos;
          const playerR = player.hitcircles.current[j][2];

          const distSq = (playerX - mobX) * (playerX - mobX) + (playerY - mobY) * (playerY - mobY);
          const radSumSq = (playerR + mobR) * (playerR + mobR);

          if (distSq < radSumSq) {
            hasCollision = true;
            break;
          }
        }
      }
    } else {
      for (let i = player.hitcircles.current.length - 1; i !== -1; i -= 1) {
        const playerX =
          player.position.x +
          player.hitcircles.current[i][0] * player.rotation.cos -
          player.hitcircles.current[i][1] * player.rotation.sin;
        const playerY =
          player.position.y +
          player.hitcircles.current[i][0] * player.rotation.sin +
          player.hitcircles.current[i][1] * player.rotation.cos;
        const playerR = player.hitcircles.current[i][2];

        const distX = Math.abs(playerX - mob.position.x);
        const distY = Math.abs(playerY - mob.position.y);

        if (distX < mob.hitbox.width / 2 + playerR && distY < mob.hitbox.height / 2 + playerR) {
          if (distX <= mob.hitbox.width / 2 || distY <= mob.hitbox.height / 2) {
            hasCollision = true;
            break;
          }

          const dx = distX - mob.hitbox.width / 2;
          const dy = distY - mob.hitbox.height / 2;

          if (dx * dx + dy * dy <= playerR * playerR) {
            hasCollision = true;
            break;
          }
        }
      }
    }

    return hasCollision;
  }

  protected checkRepelCollisions(repel: Entity, mobId: number): boolean {
    let hasCollision = false;
    let mob = null;

    if (this.storage.playerList.has(mobId)) {
      mob = this.storage.playerList.get(mobId);
    } else {
      mob = this.storage.mobList.get(mobId);
    }

    if (!mob || repel.team.current === mob.team.current) {
      return hasCollision;
    }

    if (
      repel.hitbox.x >= mob.hitbox.x + mob.hitbox.width ||
      repel.hitbox.x + repel.hitbox.width <= mob.hitbox.x ||
      repel.hitbox.y >= mob.hitbox.y + mob.hitbox.height ||
      repel.hitbox.y + repel.hitbox.height <= mob.hitbox.y
    ) {
      return hasCollision;
    }

    for (let i = mob.hitcircles.current.length - 1; i !== -1; i -= 1) {
      if (hasCollision) {
        break;
      }

      const mobX =
        mob.position.x +
        mob.hitcircles.current[i][0] * mob.rotation.cos -
        mob.hitcircles.current[i][1] * mob.rotation.sin;
      const mobY =
        mob.position.y +
        mob.hitcircles.current[i][0] * mob.rotation.sin +
        mob.hitcircles.current[i][1] * mob.rotation.cos;
      const mobR = mob.hitcircles.current[i][2];

      /**
       * TODO: optimization is needed, cache the values.
       */
      for (let j = repel.hitcircles.current.length - 1; j !== -1; j -= 1) {
        const repelX =
          repel.position.x +
          repel.hitcircles.current[j][0] * repel.rotation.cos -
          repel.hitcircles.current[j][1] * repel.rotation.sin;
        const repelY =
          repel.position.y +
          repel.hitcircles.current[j][0] * repel.rotation.sin +
          repel.hitcircles.current[j][1] * repel.rotation.cos;
        const repelR = repel.hitcircles.current[j][2];

        const distSq = (repelX - mobX) * (repelX - mobX) + (repelY - mobY) * (repelY - mobY);
        const radSumSq = (repelR + mobR) * (repelR + mobR);

        if (distSq < radSumSq) {
          hasCollision = true;
          break;
        }
      }
    }

    return hasCollision;
  }
}
