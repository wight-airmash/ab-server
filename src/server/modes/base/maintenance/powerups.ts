/* eslint-disable no-param-reassign */
import { Circle } from 'collisions';
import { MOB_DESPAWN_TYPES, MOB_TYPES } from '@airbattle/protocol';
import {
  COLLISIONS_OBJECT_TYPES,
  MAP_SIZE,
  MS_PER_SEC,
  POWERUPS_COLLISIONS,
  POWERUPS_DEFAULT_DESPAWN_MS,
  POWERUPS_GRID_COLS,
  POWERUPS_GRID_POW,
  POWERUPS_GRID_ROWS,
  POWERUPS_RESPAWN_TIMEOUT_MS,
  POWERUPS_SPAWN_GUARANTEED_SEC,
} from '@/constants';
import {
  POWERUPS_DESPAWN,
  POWERUPS_PICKED,
  COLLISIONS_ADD_OBJECT,
  BROADCAST_MOB_DESPAWN,
  POWERUPS_SPAWN_BY_COORDS,
  POWERUPS_SPAWN,
  POWERUPS_DESPAWNED,
  COLLISIONS_REMOVE_OBJECT,
  TIMELINE_CLOCK_SECOND,
  TIMELINE_GAME_MATCH_START,
} from '@/events';
import Despawn from '@/server/components/despawn';
import HitCircles from '@/server/components/hit-circles';
import Hitbox from '@/server/components/hitbox';
import Id from '@/server/components/mob-id';
import MobType from '@/server/components/mob-type';
import Owner from '@/server/components/owner';
import Position from '@/server/components/position';
import Rotation from '@/server/components/rotation';
import Entity from '@/server/entity';
import { System } from '@/server/system';
import { getRandomInt } from '@/support/numbers';
import { MobId, PlayerId } from '@/types';

export default class GamePowerups extends System {
  private chunkToCheck = 1;

  constructor({ app }) {
    super({ app });

    this.listeners = {
      [TIMELINE_GAME_MATCH_START]: this.forceDespawnUpgrades,
      [TIMELINE_CLOCK_SECOND]: this.spawnRandomPowerups,
      [POWERUPS_SPAWN]: this.onSpawnPowerup,
      [POWERUPS_SPAWN_BY_COORDS]: this.onCheckRandomSpawnByCoords,
      [POWERUPS_DESPAWN]: this.onDespawnPowerup,
      [POWERUPS_PICKED]: this.onPowerupPickedup,
    };
  }

  spawnRandomPowerups(): void {
    this.checkRandomSpawnInChunk(this.chunkToCheck);

    this.chunkToCheck += 1;

    if (this.chunkToCheck > 32) {
      this.chunkToCheck = 1;
    }
  }

  checkRandomSpawnInChunk(chunkId: number): void {
    if (this.app.config.powerupSpawnChance === 0 || !this.storage.powerupSpawns.has(chunkId)) {
      return;
    }

    const now = Date.now();
    const minToSpawn =
      POWERUPS_SPAWN_GUARANTEED_SEC -
      Math.ceil(this.app.config.powerupSpawnChance * POWERUPS_SPAWN_GUARANTEED_SEC);
    const chunk = this.storage.powerupSpawns.get(chunkId);

    if (chunk.spawned !== 0) {
      return;
    }

    if (chunk.last > now - POWERUPS_RESPAWN_TIMEOUT_MS) {
      return;
    }

    const timeDiff = Math.ceil((now - chunk.last - POWERUPS_RESPAWN_TIMEOUT_MS) / MS_PER_SEC);
    const rand = getRandomInt(timeDiff, POWERUPS_SPAWN_GUARANTEED_SEC);

    if (timeDiff >= POWERUPS_SPAWN_GUARANTEED_SEC || rand >= minToSpawn) {
      const zoneIndex = getRandomInt(0, chunk.zones.size);

      if (!chunk.zones.has(zoneIndex)) {
        return;
      }

      const [x, y] = chunk.zones.get(zoneIndex);
      const r = 32 - 22;

      this.onSpawnPowerup({
        mobId: this.helpers.createMobId(),
        type: getRandomInt(1, 10) <= 5 ? MOB_TYPES.INFERNO : MOB_TYPES.SHIELD,
        posX: x + getRandomInt(-r, r),
        posY: y + getRandomInt(-r, r),
      });

      this.log.debug(`Random powerup spawned in chunk ${chunkId}, zone (${x}, ${y})`);
    }
  }

  onCheckRandomSpawnByCoords(x: number, y: number): void {
    const hposX = (x >> POWERUPS_GRID_POW) + POWERUPS_GRID_COLS / 2;
    const hposY = (y >> POWERUPS_GRID_POW) + POWERUPS_GRID_ROWS / 2;
    const chunkIndex = hposY * POWERUPS_GRID_COLS + hposX + 1;

    this.checkRandomSpawnInChunk(chunkIndex);
  }

  /**
   * In fact, this method doesn't despawn upgrades right after calling.
   * An upgrade will despawn at the time when it should be shown on a player screen.
   */
  forceDespawnUpgrades(): void {
    this.storage.upgradeIdList.forEach(upgradeId => {
      const upgrade = this.storage.mobList.get(upgradeId);

      upgrade.despawn.time = 0;
    });

    this.log.debug(`Upgrades (${this.storage.upgradeIdList.size}) prepared to despawn.`);
  }

  onDespawnPowerup(mobId: MobId): void {
    const powerup = this.storage.mobList.get(mobId);

    this.emit(COLLISIONS_REMOVE_OBJECT, powerup.hitbox.current);
    this.emit(BROADCAST_MOB_DESPAWN, mobId, MOB_DESPAWN_TYPES.EXPIRED);

    if (powerup.mobtype.current === MOB_TYPES.UPGRADE) {
      this.storage.upgradeIdList.delete(mobId);
      this.log.debug(
        `Upgrade id${mobId} despawned (${powerup.position.x}, ${powerup.position.y}).`
      );
    } else {
      this.updateSpawnGrid(powerup.position.x, powerup.position.y);
      this.log.debug(
        `Powerup id${mobId} despawned (${powerup.position.x}, ${powerup.position.y}).`
      );

      if (powerup.mobtype.current === MOB_TYPES.SHIELD) {
        this.storage.shieldIdList.delete(mobId);
      } else {
        this.storage.infernoIdList.delete(mobId);
      }
    }

    this.storage.mobList.delete(mobId);
    this.storage.mobIdList.delete(mobId);

    this.emit(POWERUPS_DESPAWNED, mobId);
  }

  onPowerupPickedup(mobId: MobId, pickupPlayerId?: PlayerId): void {
    const powerup = this.storage.mobList.get(mobId);

    this.emit(COLLISIONS_REMOVE_OBJECT, powerup.hitbox.current);

    if (pickupPlayerId) {
      this.emit(BROADCAST_MOB_DESPAWN, mobId, MOB_DESPAWN_TYPES.PICKUP, pickupPlayerId);
    }

    this.emit(BROADCAST_MOB_DESPAWN, mobId, MOB_DESPAWN_TYPES.EXPIRED, pickupPlayerId);

    if (powerup.mobtype.current === MOB_TYPES.UPGRADE) {
      this.storage.upgradeIdList.delete(mobId);
      this.log.debug(
        `Upgrade id${mobId} picked up (${powerup.position.x}, ${powerup.position.y}).`
      );
    } else {
      this.updateSpawnGrid(powerup.position.x, powerup.position.y);
      this.emit(POWERUPS_SPAWN_BY_COORDS, powerup.position.x, powerup.position.y);
      this.log.debug(
        `Powerup id${mobId} picked up (${powerup.position.x}, ${powerup.position.y}).`
      );

      if (powerup.mobtype.current === MOB_TYPES.SHIELD) {
        this.storage.shieldIdList.delete(mobId);
      } else {
        this.storage.infernoIdList.delete(mobId);
      }
    }

    this.storage.mobList.delete(mobId);
    this.storage.mobIdList.delete(mobId);

    this.emit(POWERUPS_DESPAWNED, mobId);
  }

  onSpawnPowerup({ mobId, type, posX, posY, ownerId = null, permanent = false }): void {
    const now = Date.now();
    let collitionsType = COLLISIONS_OBJECT_TYPES.INFERNO;

    if (type === MOB_TYPES.UPGRADE) {
      collitionsType = COLLISIONS_OBJECT_TYPES.UPGRADE;
    } else if (type === MOB_TYPES.SHIELD) {
      collitionsType = COLLISIONS_OBJECT_TYPES.SHIELD;
    }

    const powerup = new Entity().attach(
      new Id(mobId),
      new MobType(type),
      new Position(posX, posY),
      new Rotation(0),
      new Despawn(now + POWERUPS_DEFAULT_DESPAWN_MS),
      new Hitbox(),
      new HitCircles([...POWERUPS_COLLISIONS[type]])
    );

    if (ownerId !== null && type === MOB_TYPES.UPGRADE) {
      powerup.attach(new Owner(ownerId));
    }

    if (permanent === true) {
      powerup.despawn.permanent = true;
    }

    /**
     * Hitbox init.
     */
    const hitboxCache = this.storage.powerupHitboxesCache[type];

    powerup.hitbox.width = hitboxCache.width;
    powerup.hitbox.height = hitboxCache.height;
    powerup.hitbox.x = ~~powerup.position.x + MAP_SIZE.HALF_WIDTH + hitboxCache.x;
    powerup.hitbox.y = ~~powerup.position.y + MAP_SIZE.HALF_HEIGHT + hitboxCache.y;

    // TL, TR, BR, BL.
    const hitbox = new Circle(
      powerup.hitbox.x - hitboxCache.x,
      powerup.hitbox.y - hitboxCache.y,
      hitboxCache.width / 2
    );

    hitbox.id = powerup.id.current;
    hitbox.type = collitionsType;
    powerup.hitbox.current = hitbox;

    this.emit(COLLISIONS_ADD_OBJECT, powerup.hitbox.current);

    /**
     * Fill grid data.
     */
    if (type !== MOB_TYPES.UPGRADE) {
      const hposX = (posX >> POWERUPS_GRID_POW) + POWERUPS_GRID_COLS / 2;
      const hposY = (posY >> POWERUPS_GRID_POW) + POWERUPS_GRID_ROWS / 2;
      const chunkIndex = hposY * POWERUPS_GRID_COLS + hposX + 1;

      const chunk = this.storage.powerupSpawns.get(chunkIndex);

      chunk.spawned += 1;
      chunk.last = now;

      this.log.debug(`Powerup id${mobId} spawned by coords (${posX}, ${posY})`);
    } else {
      this.log.debug(`Upgrade id${mobId} spawned by coords (${posX}, ${posY})`);
    }

    /**
     * Add to storages.
     */
    this.storage.mobList.set(mobId, powerup);

    if (type === MOB_TYPES.UPGRADE) {
      this.storage.upgradeIdList.add(mobId);
    } else if (type === MOB_TYPES.SHIELD) {
      this.storage.shieldIdList.add(mobId);
    } else {
      this.storage.infernoIdList.add(mobId);
    }
  }

  updateSpawnGrid(x: number, y: number): void {
    const hposX = (x >> POWERUPS_GRID_POW) + POWERUPS_GRID_COLS / 2;
    const hposY = (y >> POWERUPS_GRID_POW) + POWERUPS_GRID_ROWS / 2;
    const chunkIndex = hposY * POWERUPS_GRID_COLS + hposX + 1;

    const chunk = this.storage.powerupSpawns.get(chunkIndex);

    chunk.spawned -= 1;
  }
}
