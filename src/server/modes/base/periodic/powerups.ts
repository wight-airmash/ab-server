import { MS_PER_SEC } from '@/constants';
import {
  POWERUPS_ADD_PERIODIC,
  TIMELINE_CLOCK_SECOND,
  TIMELINE_GAME_MATCH_START,
  POWERUPS_DESPAWNED,
  POWERUPS_SPAWN,
} from '@/events';
import { System } from '@/server/system';
import { PeriodicPowerupTemplate, PeriodicPowerup, MobId } from '@/types';

export default class PowerupsPeriodic extends System {
  protected spawnedPowerups: Map<MobId, PeriodicPowerup> = new Map();

  protected powerups: PeriodicPowerup[] = [];

  constructor({ app }) {
    super({ app });

    this.listeners = {
      [TIMELINE_CLOCK_SECOND]: this.checkSpawn,
      [TIMELINE_GAME_MATCH_START]: this.spawnPowerups,
      [POWERUPS_ADD_PERIODIC]: this.addPowerups,
      [POWERUPS_DESPAWNED]: this.onPowerupDespawned,
    };
  }

  protected addPowerup(powerupTemplate: PeriodicPowerupTemplate): void {
    const powerup = {
      ...powerupTemplate,
      lastUpdate: 0,
      mobId: null,
      permanent: true,
    } as PeriodicPowerup;

    powerup.interval *= MS_PER_SEC;

    this.powerups.push(powerup);
  }

  protected spawnPowerup(powerupIndex: number): void {
    const powerup = this.powerups[powerupIndex];

    powerup.mobId = this.helpers.createMobId();
    powerup.lastUpdate = Date.now();

    this.emit(POWERUPS_SPAWN, powerup);
    this.spawnedPowerups.set(powerup.mobId, powerup);
  }

  addPowerups(powerups: PeriodicPowerupTemplate | PeriodicPowerupTemplate[]): void {
    if (Array.isArray(powerups)) {
      for (let index = 0; index < powerups.length; index += 1) {
        this.addPowerup(powerups[index]);
      }
    } else {
      this.addPowerup(powerups);
    }
  }

  spawnPowerups(): void {
    for (let index = 0; index < this.powerups.length; index += 1) {
      if (this.powerups[index].mobId === null) {
        this.spawnPowerup(index);
      }
    }
  }

  onPowerupDespawned(mobId: MobId): void {
    if (this.spawnedPowerups.has(mobId)) {
      const powerup = this.spawnedPowerups.get(mobId);

      powerup.lastUpdate = Date.now();
      powerup.mobId = null;

      this.spawnedPowerups.delete(mobId);
    }
  }

  checkSpawn(): void {
    /**
     * Skip check if all periodic powerups have already spawned.
     */
    if (this.powerups.length === this.spawnedPowerups.size) {
      return;
    }

    const now = Date.now();

    for (let index = 0; index < this.powerups.length; index += 1) {
      const powerup = this.powerups[index];

      if (powerup.mobId === null && powerup.lastUpdate < now - powerup.interval) {
        this.spawnPowerup(index);
      }
    }
  }
}
