import { Body, Circle, Collisions } from 'collisions';
import {
  COLLISIONS_OBJECT_TYPES,
  PLAYERS_ALIVE_STATUSES,
  PLAYERS_HEALTH,
  POWERUPS_DEFAULT_DURATION_MS,
  SERVER_BOUNCE_DELAY_MS,
  UPGRADES_OWNER_INACTIVITY_TIMEOUT_MS,
} from '../../constants';
import {
  BROADCAST_CHAT_SAY_REPEAT,
  BROADCAST_EVENT_BOUNCE,
  BROADCAST_EVENT_REPEL,
  BROADCAST_MOB_DESPAWN_COORDS,
  BROADCAST_MOB_UPDATE,
  BROADCAST_MOB_UPDATE_STATIONARY,
  BROADCAST_PLAYER_HIT,
  BROADCAST_PLAYER_UPDATE,
  COLLISIONS_ADD_OBJECT,
  COLLISIONS_DETECT,
  COLLISIONS_REMOVE_OBJECT,
  CTF_PLAYER_CROSSED_FLAGZONE,
  CTF_PLAYER_TOUCHED_FLAG,
  PLAYERS_APPLY_INFERNO,
  PLAYERS_APPLY_SHIELD,
  PLAYERS_BOUNCE,
  PLAYERS_HIT,
  PLAYERS_KILL,
  PLAYERS_REPEL_MOBS,
  POWERUPS_DESPAWN,
  POWERUPS_PICKED,
  PROJECTILES_DELETE,
  RESPONSE_EVENT_LEAVE_HORIZON,
  RESPONSE_SCORE_UPDATE,
  TIMELINE_BEFORE_GAME_START,
} from '../../events';
import {
  BroadcastStorage,
  Flag,
  FlagZone,
  MainConnectionId,
  MobId,
  Mountain,
  Player,
  Powerup,
  Projectile,
  Repel,
  Viewport,
} from '../../types';
import { System } from '../system';

const addViewer = (storage: BroadcastStorage, mobId: MobId, viewer: MainConnectionId): void => {
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
      [COLLISIONS_ADD_OBJECT]: this.onAddToCollisionDetector,
      [COLLISIONS_DETECT]: this.onDetectCollisions,
      [COLLISIONS_REMOVE_OBJECT]: this.onRemoveFromCollisionDetector,
      [TIMELINE_BEFORE_GAME_START]: this.initDetector,
    };
  }

  initDetector(): void {
    this.app.detector = new Collisions();
  }

  protected isPowerupExpired(powerupId: MobId): boolean {
    const powerup = this.storage.mobList.get(powerupId) as Powerup;

    if (!powerup || (!powerup.despawn.permanent && powerup.despawn.time <= this.now)) {
      return true;
    }

    return false;
  }

  onAddToCollisionDetector(body: Body): void {
    this.app.detector.insert(body);
  }

  onRemoveFromCollisionDetector(body: Body): void {
    this.app.detector.remove(body);
  }

  onDetectCollisions(): void {
    this.now = Date.now();

    const broadcast: BroadcastStorage = new Map();

    /**
     * Boxes to be destroyed.
     */
    const inactiveBoxes: Set<MobId> = new Set();

    /**
     * Boxes to be broadcasted.
     */
    const broadcastBoxes: Set<MobId> = new Set();

    /**
     * All projectiles that need to be checked for collisions.
     */
    const projectiles: Set<MobId> = new Set();

    /**
     * Update collisions layer.
     */
    this.app.detector.update();

    /**
     * Update viewports (on player's screen objects) and fill
     * broadcast lists.
     */
    {
      const viewportsIterator = this.storage.viewportList.values();
      let viewport: Viewport = viewportsIterator.next().value;

      while (viewport !== undefined) {
        const playerId = viewport.id;

        if (!this.storage.playerMainConnectionList.has(playerId)) {
          viewport = viewportsIterator.next().value;

          continue;
        }

        viewport.leaved = new Set(viewport.current);
        viewport.current.clear();

        /**
         * Player always sees itself.
         */
        addViewer(broadcast, playerId, viewport.connectionId);

        /**
         * Potential collisions.
         * Only players, projectiles and boxes can get into this list.
         */
        const mobs = viewport.hitbox.viewportPotentials();

        for (let index = 0; index < mobs.length; index += 1) {
          viewport.current.add(mobs[index].id);

          /**
           * Mark the player as a viewer of the mob.
           */
          addViewer(broadcast, mobs[index].id, viewport.connectionId);

          /**
           * Collect projectile ids. It will need later
           * to not to check each projectile.
           */
          if (mobs[index].isProjectile) {
            projectiles.add(mobs[index].id);
          }

          if (viewport.leaved.has(mobs[index].id)) {
            // A mob is still visible, remove it from leaved.
            viewport.leaved.delete(mobs[index].id);
          } else {
            if (mobs[index].isBox) {
              if (inactiveBoxes.has(mobs[index].id)) {
                continue;
              } else if (this.isPowerupExpired(mobs[index].id)) {
                inactiveBoxes.add(mobs[index].id);
              } else {
                broadcastBoxes.add(mobs[index].id);
              }

              continue;
            }

            if (mobs[index].isProjectile) {
              this.delay(BROADCAST_MOB_UPDATE, mobs[index].id, playerId);
            } else {
              this.delay(BROADCAST_PLAYER_UPDATE, mobs[index].id, playerId);

              if (this.storage.playerIdSayBroadcastList.has(mobs[index].id)) {
                this.emit(BROADCAST_CHAT_SAY_REPEAT, mobs[index].id, playerId);
              }
            }
          }
        }

        /**
         * Now in `viewport.leaved` are all the mobs, which were visible
         * to the player on the previous tick, but not on this tick.
         */
        if (viewport.leaved.size !== 0) {
          this.delay(RESPONSE_EVENT_LEAVE_HORIZON, viewport.connectionId, viewport.leaved);
        }

        viewport = viewportsIterator.next().value;
      }
    }

    this.storage.broadcast = broadcast;

    /**
     * Despawn outdated boxes.
     */
    {
      const boxesIterator = inactiveBoxes.values();
      let boxId: MobId = boxesIterator.next().value;

      while (boxId !== undefined) {
        this.emit(POWERUPS_DESPAWN, boxId);
        boxId = boxesIterator.next().value;
      }
    }

    /**
     * Broadcast boxes update events.
     */
    {
      const boxesIterator = broadcastBoxes.values();
      let boxId: MobId = boxesIterator.next().value;

      while (boxId !== undefined) {
        this.emit(BROADCAST_MOB_UPDATE_STATIONARY, boxId);
        boxId = boxesIterator.next().value;
      }
    }

    this.emitDelayed();

    /**
     * Players collisions.
     */
    {
      const playersIterator = this.storage.playerList.values();
      let player: Player = playersIterator.next().value;

      while (player !== undefined) {
        if (player.alivestatus.current !== PLAYERS_ALIVE_STATUSES.ALIVE) {
          player = playersIterator.next().value;

          continue;
        }

        /**
         * Handle repel special.
         */
        if (player.planestate.repel) {
          const repel = this.storage.repelList.get(player.id.current);
          const collisions = repel.hitbox.current.repelPotentials();
          const repelProjectiles = [];
          const repelPlayers = [];

          for (let ci = 0; ci < collisions.length; ci += 1) {
            const id = collisions[ci].id; // eslint-disable-line prefer-destructuring

            if (this.isRepelCollide(repel, id)) {
              if (collisions[ci].type === COLLISIONS_OBJECT_TYPES.PLAYER) {
                repelPlayers.push(id);
              } else {
                repelProjectiles.push(id);
              }
            }
          }

          /**
           * This handler emits delayed events.
           * emitDelayed() should be called.
           */
          this.emit(PLAYERS_REPEL_MOBS, player, repelPlayers, repelProjectiles);
          this.delay(BROADCAST_EVENT_REPEL, player.id.current, repelPlayers, repelProjectiles);

          this.emitDelayed();
        }

        /**
         * Handle player collisions.
         */
        const collisions = player.hitbox.current.playerPotentials();

        for (let ci = 0; ci < collisions.length; ci += 1) {
          const id = collisions[ci].id; // eslint-disable-line prefer-destructuring
          const type = collisions[ci].type; // eslint-disable-line prefer-destructuring

          if (this.isPlayerCollide(player, id)) {
            /**
             * CTF flag capture zones.
             */
            if (type === COLLISIONS_OBJECT_TYPES.FLAGZONE) {
              this.emit(CTF_PLAYER_CROSSED_FLAGZONE, player.id.current, id);

              continue;
            }

            /**
             * CTF flags.
             */
            if (type === COLLISIONS_OBJECT_TYPES.FLAG) {
              this.emit(CTF_PLAYER_TOUCHED_FLAG, player.id.current, id);

              continue;
            }

            /**
             * Mountains.
             */
            if (
              type === COLLISIONS_OBJECT_TYPES.MOUNTAIN &&
              player.times.lastBounce < this.now - SERVER_BOUNCE_DELAY_MS
            ) {
              const hitbox = collisions[ci] as Circle;

              this.emit(PLAYERS_BOUNCE, player.id.current, hitbox.x, hitbox.y, hitbox.radius);
              this.delay(BROADCAST_EVENT_BOUNCE, player.id.current);

              continue;
            }

            /**
             * Boxes.
             */
            if (collisions[ci].isBox && !inactiveBoxes.has(id)) {
              if (type === COLLISIONS_OBJECT_TYPES.UPGRADE) {
                const box = this.storage.mobList.get(id) as Powerup;

                if (
                  box.owner.current === player.id.current &&
                  box.owner.lastDrop > this.now - UPGRADES_OWNER_INACTIVITY_TIMEOUT_MS
                ) {
                  continue;
                }
              }

              inactiveBoxes.add(id);
              this.delay(POWERUPS_PICKED, id, player.id.current);

              if (type === COLLISIONS_OBJECT_TYPES.INFERNO) {
                this.delay(PLAYERS_APPLY_INFERNO, player.id.current, POWERUPS_DEFAULT_DURATION_MS);
                player.inferno.collected += 1;
              } else if (type === COLLISIONS_OBJECT_TYPES.SHIELD) {
                this.delay(PLAYERS_APPLY_SHIELD, player.id.current, POWERUPS_DEFAULT_DURATION_MS);
                player.shield.collected += 1;
              } else {
                player.upgrades.amount += 1;
                player.upgrades.collected += 1;

                if (!player.delayed.RESPONSE_SCORE_UPDATE) {
                  player.delayed.RESPONSE_SCORE_UPDATE = true;
                  this.delay(RESPONSE_SCORE_UPDATE, player.id.current);
                }
              }
            }

            /**
             * Projectiles.
             */
            if (collisions[ci].isProjectile && projectiles.has(id)) {
              if (player.health.current === PLAYERS_HEALTH.MIN) {
                break;
              }

              /**
               * Projectile is destroyed, don't need to check it later.
               */
              projectiles.delete(id);

              this.emit(PLAYERS_HIT, player.id.current, id);
              this.delay(BROADCAST_PLAYER_HIT, id, [player.id.current]);
              this.delay(PROJECTILES_DELETE, id);

              if (player.health.current === PLAYERS_HEALTH.MIN) {
                this.emit(PLAYERS_KILL, player.id.current, id);

                if (!player.delayed.RESPONSE_SCORE_UPDATE) {
                  player.delayed.RESPONSE_SCORE_UPDATE = true;
                  this.delay(RESPONSE_SCORE_UPDATE, player.id.current);
                }

                const projectile = this.storage.mobList.get(id) as Projectile;

                if (this.storage.playerList.has(projectile.owner.current)) {
                  const enemy = this.storage.playerList.get(projectile.owner.current);

                  if (!enemy.delayed.RESPONSE_SCORE_UPDATE) {
                    enemy.delayed.RESPONSE_SCORE_UPDATE = true;
                    this.delay(RESPONSE_SCORE_UPDATE, projectile.owner.current);
                  }
                }

                break;
              }
            }
          }
        }

        player = playersIterator.next().value;
      }
    }

    this.emitDelayed();

    /**
     * Actually all the projectiles should be checked,
     * but with a large scale factor limit (like default 5500)
     * it doesn't matter.
     *
     * If you use a small SF limit, you need to change this code,
     * otherwise you will get projectiles sometimes fly through mountains.
     */
    {
      const projectilesIterator = projectiles.values();
      let projectileId: MobId = projectilesIterator.next().value;

      while (projectileId !== undefined) {
        const projectile = this.storage.mobList.get(projectileId) as Projectile;
        const collisions = projectile.hitbox.current.projectilePotentials();

        for (let ci = 0; ci < collisions.length; ci += 1) {
          if (this.isProjectileCollide(projectile, collisions[ci].id)) {
            this.emit(BROADCAST_MOB_DESPAWN_COORDS, projectileId);
            this.emit(PROJECTILES_DELETE, projectileId);

            break;
          }
        }

        projectileId = projectilesIterator.next().value;
      }
    }
  }

  private isProjectileCollide(projectile: Projectile, mountainId: MobId): boolean {
    const mountain = this.storage.mobList.get(mountainId) as Mountain;
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
     * Check only forward projectile hitcircle (index 0).
     */
    const mountainR = mountain.hitcircles.current[0][2];

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
      (projectileX - mountain.position.x) * (projectileX - mountain.position.x) +
      (projectileY - mountain.position.y) * (projectileY - mountain.position.y);
    const radSumSq = (projectileR + mountainR) * (projectileR + mountainR);

    if (distSq < radSumSq) {
      hasCollision = true;
    }

    return hasCollision;
  }

  private isPlayerCollide(player: Player, mobId: MobId): boolean {
    const mob: Projectile | Powerup | Mountain | Flag | FlagZone = this.storage.mobList.get(mobId);
    let hasCollision = false;

    if (
      !mob ||
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

  private isRepelCollide(repel: Repel, mobId: number): boolean {
    let hasCollision = false;
    let mob: Player | Projectile = null;

    if (this.storage.playerList.has(mobId)) {
      mob = this.storage.playerList.get(mobId);
    } else {
      mob = this.storage.mobList.get(mobId) as Projectile;
    }

    if (
      !mob ||
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
