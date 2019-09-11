import { CTF_TEAMS } from '@airbattle/protocol';
import {
  MAP_COORDS,
  MAP_SIZE,
  CTF_FLAGS_SPAWN_ZONE_COLLISIONS,
  CTF_FLAG_COLLISIONS,
  FFA_MAP_REGIONS,
  FFA_PLAYERS_SPAWN_ZONES,
  MOUNTAIN_OBJECTS,
  PI_X2,
  POWERUPS_COLLISIONS,
  POWERUPS_RESPAWN_TIMEOUT_MS,
  PROJECTILES_COLLISIONS,
  PROJECTILES_SHAPES,
  SHIPS_ENCLOSE_RADIUS,
  SHIPS_SPECS,
  SHIPS_TYPES,
} from '@/constants';

import { TIMELINE_BEFORE_GAME_START } from '@/events';
import { System } from '@/server/system';
import { SpawnZones, PowerupSpawnChunk } from '@/types';

/**
 * TODO: combine data from the constants. Now the code is duplicated.
 */
const buildinObjects = [
  [
    CTF_FLAGS_SPAWN_ZONE_COLLISIONS[CTF_TEAMS.BLUE][0],
    CTF_FLAGS_SPAWN_ZONE_COLLISIONS[CTF_TEAMS.BLUE][1],
    CTF_FLAGS_SPAWN_ZONE_COLLISIONS[CTF_TEAMS.BLUE][2],
  ],
  [
    CTF_FLAGS_SPAWN_ZONE_COLLISIONS[CTF_TEAMS.RED][0],
    CTF_FLAGS_SPAWN_ZONE_COLLISIONS[CTF_TEAMS.RED][1],
    CTF_FLAGS_SPAWN_ZONE_COLLISIONS[CTF_TEAMS.RED][2],
  ],
  [
    // Europe inferno.
    920,
    -2800,
    50,
  ],
  [
    // Blue base inferno.
    -7440,
    -1360,
    50,
  ],
  [
    // Red base inferno.
    6565,
    -935,
    50,
  ],
  [
    // Blue base shield.
    -9300,
    -1480,
    50,
  ],
  [
    // Red base shield.
    8350,
    -935,
    50,
  ],
];

/**
 * Check the collisions. The game server isn't started yet,
 * so efficiency doesn't matter.
 *
 * @param x
 * @param y
 * @param r
 */
const isCollide = (x: number, y: number, r: number): boolean => {
  let result = false;

  for (let index = 0; index < MOUNTAIN_OBJECTS.length; index += 1) {
    const [mx, my, mr] = MOUNTAIN_OBJECTS[index];
    const distSq = (x - mx) * (x - mx) + (y - my) * (y - my);
    const radSumSq = (r + mr) * (r + mr);

    if (distSq <= radSumSq) {
      result = true;

      return result;
    }
  }

  for (let index = 0; index < buildinObjects.length; index += 1) {
    const [ox, oy, or] = buildinObjects[index];
    const distSq = (x - ox) * (x - ox) + (y - oy) * (y - oy);
    const radSumSq = (r + or) * (r + or);

    if (distSq <= radSumSq) {
      result = true;

      return result;
    }
  }

  return result;
};

/**
 * Generate airplane spawn zones.
 *
 * @param storage
 * @param radius enclose circle radius
 */
const generateSpawnZones = (storage: SpawnZones, radius: number): void => {
  const spawnZone = FFA_PLAYERS_SPAWN_ZONES[FFA_MAP_REGIONS.EUROPE];
  let index = 0;

  for (let y = MAP_COORDS.MIN_Y + radius; y < MAP_COORDS.MAX_Y; y += radius * 2) {
    for (let x = MAP_COORDS.MIN_X + radius; x < MAP_COORDS.MAX_X; x += radius * 2) {
      if (
        x >= spawnZone.MIN_X &&
        x <= spawnZone.MAX_X &&
        y >= spawnZone.MIN_Y &&
        y <= spawnZone.MAX_Y
      ) {
        if (!isCollide(x, y, radius * 2)) {
          storage.set(index, [x, y]);
          index += 1;
        }
      }
    }
  }
};

/**
 * Generate powerups spawn chunks and zones.
 *
 * @param storage
 */
const generatePowerupSpawns = (storage: Map<number, PowerupSpawnChunk>): void => {
  const POW = 12;
  const CHUNK_WIDTH = 1 << POW; // 4096
  const CHUNK_HEIGHT = 1 << POW;
  const RADIUS = 32;

  const cols = MAP_SIZE.WIDTH / CHUNK_WIDTH;
  const rows = MAP_SIZE.HEIGHT / CHUNK_HEIGHT;

  for (let cy = MAP_COORDS.MIN_Y; cy < MAP_COORDS.MAX_Y; cy += CHUNK_HEIGHT) {
    for (let cx = MAP_COORDS.MIN_X; cx < MAP_COORDS.MAX_X; cx += CHUNK_WIDTH) {
      const hcx = (cx >> POW) + cols / 2;
      const hcy = (cy >> POW) + rows / 2;
      const chunkIndex = hcy * cols + hcx + 1;

      const chunk = {
        spawned: 0,
        last: Date.now() - POWERUPS_RESPAWN_TIMEOUT_MS,
        attend: 0,
        zones: new Map(),
      } as PowerupSpawnChunk;

      let index = 0;

      /**
       * Generate spawn chunk zones.
       */
      for (let y = cy + RADIUS; y < cy + CHUNK_HEIGHT; y += RADIUS * 2) {
        for (let x = cx + RADIUS; x < cx + CHUNK_WIDTH; x += RADIUS * 2) {
          if (!isCollide(x, y, RADIUS * 2)) {
            chunk.zones.set(index, [x, y]);
            index += 1;
          }
        }
      }

      storage.set(chunkIndex, chunk);
    }
  }
};

export default class GameWarming extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [TIMELINE_BEFORE_GAME_START]: this.warmCollisionCache,
    };
  }

  protected static getHitboxCache(collisions: number[][]): any {
    let calculated = {};
    let rot = 0;

    while (rot <= PI_X2) {
      let hashRot = 0;
      let calcRot = 0;

      if (Math.floor(rot * 1000) / 1000 !== rot) {
        hashRot = Math.ceil(rot * 1000) / 1000;
        calcRot = Math.ceil(rot * 1000) / 1000;
      } else {
        hashRot = Math.floor(rot * 1000) / 1000;
        calcRot = Math.floor(rot * 1000) / 1000;
      }

      let minX = MAP_COORDS.MAX_X;
      let minY = MAP_COORDS.MAX_Y;
      let maxX = MAP_COORDS.MIN_X;
      let maxY = MAP_COORDS.MIN_Y;

      for (let ci = 0; ci < collisions.length; ci += 1) {
        const [hitCircleX, hitCircleY, hitCircleR] = collisions[ci];
        const x = hitCircleX * Math.cos(calcRot) - hitCircleY * Math.sin(calcRot);
        const y = hitCircleX * Math.sin(calcRot) + hitCircleY * Math.cos(calcRot);

        if (minX > x - hitCircleR) {
          minX = x - hitCircleR;
        }

        if (maxX < x + hitCircleR) {
          maxX = x + hitCircleR;
        }

        if (minY > y - hitCircleR) {
          minY = y - hitCircleR;
        }

        if (maxY < y + hitCircleR) {
          maxY = y + hitCircleR;
        }
      }

      let width = ~~(Math.abs(minX) + Math.abs(maxX) + 0.5);
      let height = ~~(Math.abs(minY) + Math.abs(maxY) + 0.5);

      if (width % 2 !== 0) {
        width += 1;
      }

      if (height % 2 !== 0) {
        height += 1;
      }

      const x = -width / 2;
      const y = -height / 2;

      if (collisions.length === 1) {
        calculated = { width, height, x, y };
        break;
      } else {
        calculated[hashRot] = { width, height, x, y };
      }

      if ((Math.floor(rot * 1000) + 1) / 1000 === rot) {
        rot = (Math.ceil(rot * 1000) + 1) / 1000;
      } else {
        rot = (Math.floor(rot * 1000) + 1) / 1000;
      }
      // rot += 0.001;
      // rot = ((rot % PI_X2) + PI_X2) % PI_X2;

      if (rot > PI_X2) {
        break;
      }
    }

    return calculated;
  }

  warmCollisionCache(): void {
    this.log.info('Warm up the cache. It will take some time...');

    Object.values(SHIPS_TYPES).forEach(shipType => {
      this.storage.shipHitboxesCache[shipType] = GameWarming.getHitboxCache(
        SHIPS_SPECS[shipType].collisions
      );
    });

    this.storage.shipHitboxesCache = Object.freeze(this.storage.shipHitboxesCache);

    Object.values(PROJECTILES_SHAPES).forEach(missileType => {
      this.storage.projectileHitboxesCache[missileType] = GameWarming.getHitboxCache(
        PROJECTILES_COLLISIONS[missileType]
      );
    });

    this.storage.projectileHitboxesCache = Object.freeze(this.storage.projectileHitboxesCache);

    Object.entries(POWERUPS_COLLISIONS).forEach(([powerupType, powerupCollisions]) => {
      this.storage.powerupHitboxesCache[powerupType] = GameWarming.getHitboxCache(
        powerupCollisions
      );
    });

    this.storage.powerupHitboxesCache = Object.freeze(this.storage.powerupHitboxesCache);

    this.storage.flagHitboxesCache = Object.freeze(GameWarming.getHitboxCache(CTF_FLAG_COLLISIONS));

    this.log.debug('Mobs hitboxes pre calculated.');

    generateSpawnZones(this.storage.predatorSpawnZones, SHIPS_ENCLOSE_RADIUS.PREDATOR);
    generateSpawnZones(this.storage.goliathSpawnZones, SHIPS_ENCLOSE_RADIUS.GOLIATH);
    generateSpawnZones(this.storage.copterSpawnZones, SHIPS_ENCLOSE_RADIUS.COPTER);
    generateSpawnZones(this.storage.tornadoSpawnZones, SHIPS_ENCLOSE_RADIUS.TORNADO);
    generateSpawnZones(this.storage.prowlerSpawnZones, SHIPS_ENCLOSE_RADIUS.PROWLER);
    this.log.debug('Planes spawn zones pre calculated.');

    generatePowerupSpawns(this.storage.powerupSpawns);
    this.log.debug('Power-ups spawn zones pre calculated.');

    this.log.debug('Cache warmed up.');
  }
}
