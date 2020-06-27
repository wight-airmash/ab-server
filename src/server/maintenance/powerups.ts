import { GAME_TYPES, MOB_DESPAWN_TYPES, MOB_TYPES } from '@airbattle/protocol';
import { Circle } from 'collisions';
import {
  COLLISIONS_OBJECT_TYPES,
  MAP_SIZE,
  POWERUPS_COLLISIONS,
  POWERUPS_DEFAULT_DESPAWN_MS,
  POWERUPS_RESPAWN_TIMEOUT_MS,
} from '../../constants';
import {
  BROADCAST_MOB_DESPAWN,
  COLLISIONS_ADD_OBJECT,
  COLLISIONS_REMOVE_OBJECT,
  POWERUPS_DESPAWN,
  POWERUPS_DESPAWNED,
  POWERUPS_PICKED,
  POWERUPS_SPAWN,
  TIMELINE_CLOCK_MINUTE,
  TIMELINE_CLOCK_SECOND,
  TIMELINE_GAME_MATCH_START,
  TIMELINE_GAME_START,
  POWERUPS_UPDATE_CONFIG,
} from '../../events';
import { getRandomInt } from '../../support/numbers';
import { MobId, PlayerId, Powerup } from '../../types';
import Despawn from '../components/despawn';
import HitCircles from '../components/hit-circles';
import Hitbox from '../components/hitbox';
import Id from '../components/mob-id';
import MobType from '../components/mob-type';
import Owner from '../components/owner';
import Position from '../components/position';
import Rotation from '../components/rotation';
import Entity from '../entity';
import { System } from '../system';

type ChunkId = number;

export default class GamePowerups extends System {
  private chunkIndexToCheck = 0;

  private chunksAmount = 0;

  private stopSpawn = false;

  private chunksPerCheck = 1;

  private spawnsPerMinute = 0;

  private spawnChance = 1;

  private spawnLimit = 1;

  private shuffledChunks: ChunkId[] = [];

  constructor({ app }) {
    super({ app });

    this.listeners = {
      [POWERUPS_DESPAWN]: this.onDespawnPowerup,
      [POWERUPS_PICKED]: this.onPowerupPickedup,
      [POWERUPS_SPAWN]: this.onSpawnPowerup,
      [POWERUPS_UPDATE_CONFIG]: this.updateConfig,
      [TIMELINE_CLOCK_MINUTE]: this.onMinute,
      [TIMELINE_CLOCK_SECOND]: this.spawnRandomPowerups,
      [TIMELINE_GAME_MATCH_START]: this.forceDespawnUpgrades,
      [TIMELINE_GAME_START]: this.onGameStart,
    };
  }

  onGameStart(): void {
    this.shuffledChunks = [...this.storage.powerupSpawns.keys()];

    for (let i = this.shuffledChunks.length - 1; i > 0; i -= 1) {
      const j = ~~(Math.random() * (i + 1));

      [this.shuffledChunks[i], this.shuffledChunks[j]] = [
        this.shuffledChunks[j],
        this.shuffledChunks[i],
      ];
    }

    this.chunksAmount = this.shuffledChunks.length;

    if (this.chunksAmount > 59) {
      this.chunksPerCheck = Math.ceil(this.chunksAmount / 60);
    }

    this.updateConfig();
  }

  updateConfig(): void {
    this.spawnChance = this.config.powerups.chance;
    this.spawnLimit = Math.ceil(this.chunksAmount * this.config.powerups.limit);

    this.log.debug('Powerups config: %o', {
      chunksAmount: this.chunksAmount,
      chunksPerCheck: this.chunksPerCheck,
      maxSpawnsPerMinute: this.spawnLimit,
    });
  }

  onMinute(): void {
    this.stopSpawn = false;
    this.spawnsPerMinute = 0;
  }

  spawnRandomPowerups(): void {
    if (this.stopSpawn || this.spawnLimit === 0) {
      return;
    }

    for (
      let index = 0;
      index < this.chunksPerCheck && this.chunkIndexToCheck < this.chunksAmount;
      index += 1
    ) {
      this.checkRandomSpawnInChunk(this.shuffledChunks[this.chunkIndexToCheck]);

      this.chunkIndexToCheck += 1;

      if (this.spawnsPerMinute >= this.spawnLimit) {
        break;
      }
    }

    if (this.chunkIndexToCheck >= this.chunksAmount || this.spawnsPerMinute >= this.spawnLimit) {
      this.stopSpawn = true;
      this.chunkIndexToCheck = 0;
    }
  }

  checkRandomSpawnInChunk(chunkId: ChunkId): void {
    if (this.spawnChance === 0 || !this.storage.powerupSpawns.has(chunkId)) {
      return;
    }

    const now = Date.now();
    const chunk = this.storage.powerupSpawns.get(chunkId);

    /**
     * No spawn if already spawned or if last spawn event in chunk was within timeout ago.
     */
    if (chunk.spawned !== 0 || chunk.last > now - POWERUPS_RESPAWN_TIMEOUT_MS) {
      return;
    }

    const chunkChance = this.spawnChance * chunk.chanceFactor;

    if (Math.random() < chunkChance || chunkChance >= 1) {
      const zoneIndex = getRandomInt(0, chunk.zones.size);

      if (!chunk.zones.has(zoneIndex)) {
        return;
      }

      const [x, y] = chunk.zones.get(zoneIndex);
      const r = 32 - 22;

      let type: MOB_TYPES;

      if (this.config.server.typeId === GAME_TYPES.BTR || chunk.chanceRatio === 0) {
        type = MOB_TYPES.INFERNO;
      } else if (chunk.chanceRatio === 1) {
        type = MOB_TYPES.SHIELD;
      } else {
        type = Math.random() < chunk.chanceRatio ? MOB_TYPES.SHIELD : MOB_TYPES.INFERNO;
      }

      this.onSpawnPowerup({
        mobId: this.helpers.createMobId(),
        type,
        posX: x + getRandomInt(-r, r),
        posY: y + getRandomInt(-r, r),
        chunkId,
      });

      this.spawnsPerMinute += 1;
    }
  }

  /**
   * In fact, this method doesn't despawn upgrades right after calling.
   * An upgrade will despawn at the time when it should be shown on a player screen.
   */
  forceDespawnUpgrades(): void {
    const upgradesIterator = this.storage.upgradeIdList.values();
    let upgradeId: MobId = upgradesIterator.next().value;

    while (upgradeId !== undefined) {
      const upgrade = this.storage.mobList.get(upgradeId) as Powerup;

      upgrade.despawn.time = 0;
      upgradeId = upgradesIterator.next().value;
    }
  }

  onDespawnPowerup(mobId: MobId): void {
    const powerup = this.storage.mobList.get(mobId) as Powerup;

    this.emit(COLLISIONS_REMOVE_OBJECT, powerup.hitbox.current);
    this.emit(BROADCAST_MOB_DESPAWN, mobId, MOB_DESPAWN_TYPES.EXPIRED);

    if (powerup.mobtype.current === MOB_TYPES.UPGRADE) {
      this.storage.upgradeIdList.delete(mobId);
    } else {
      this.updateSpawnGrid(powerup.position.chunk);

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
    const powerup = this.storage.mobList.get(mobId) as Powerup;

    this.emit(COLLISIONS_REMOVE_OBJECT, powerup.hitbox.current);

    if (pickupPlayerId) {
      this.emit(BROADCAST_MOB_DESPAWN, mobId, MOB_DESPAWN_TYPES.PICKUP, pickupPlayerId);
    }

    this.emit(BROADCAST_MOB_DESPAWN, mobId, MOB_DESPAWN_TYPES.EXPIRED, pickupPlayerId);

    if (powerup.mobtype.current === MOB_TYPES.UPGRADE) {
      this.storage.upgradeIdList.delete(mobId);
    } else {
      this.updateSpawnGrid(powerup.position.chunk);
      this.checkRandomSpawnInChunk(powerup.position.chunk);

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

  onSpawnPowerup({
    mobId,
    type,
    posX,
    posY,
    ownerId = null,
    permanent = false,
    chunkId = null,
  }): void {
    const now = Date.now();
    let collitionsType = COLLISIONS_OBJECT_TYPES.INFERNO;

    if (type === MOB_TYPES.UPGRADE) {
      collitionsType = COLLISIONS_OBJECT_TYPES.UPGRADE;
    } else if (type === MOB_TYPES.SHIELD) {
      collitionsType = COLLISIONS_OBJECT_TYPES.SHIELD;
    }

    const powerup: Powerup = new Entity().attach(
      new Despawn(now + POWERUPS_DEFAULT_DESPAWN_MS),
      new Hitbox(),
      new HitCircles([...POWERUPS_COLLISIONS[type]]),
      new Id(mobId),
      new MobType(type),
      new Position(posX, posY),
      new Rotation(0)
    );

    if (ownerId !== null && type === MOB_TYPES.UPGRADE) {
      powerup.attach(new Owner(ownerId));
    }

    if (permanent) {
      powerup.despawn.permanent = true;
    }

    /**
     * Fill grid data.
     */
    if (chunkId !== null) {
      powerup.position.chunk = chunkId;

      const chunk = this.storage.powerupSpawns.get(chunkId);

      chunk.spawned += 1;
      chunk.last = now;
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
    hitbox.isCollideWithViewport = true;
    hitbox.isCollideWithPlayer = true;
    hitbox.isBox = true;
    powerup.hitbox.current = hitbox;

    this.emit(COLLISIONS_ADD_OBJECT, powerup.hitbox.current);

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

  updateSpawnGrid(chunkId: ChunkId): void {
    if (this.storage.powerupSpawns.has(chunkId)) {
      const chunk = this.storage.powerupSpawns.get(chunkId);

      chunk.spawned -= 1;
    }
  }
}
