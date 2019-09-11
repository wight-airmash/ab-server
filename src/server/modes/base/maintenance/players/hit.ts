import { PLAYERS_HEALTH, PROJECTILES_SPECS, SHIPS_SPECS, UPGRADES_SPECS } from '@/constants';
import { BROADCAST_EVENT_STEALTH, BROADCAST_PLAYER_UPDATE, PLAYERS_HIT } from '@/events';
import { System } from '@/server/system';
import { getRandomInt } from '@/support/numbers';
import { MobId, PlayerId } from '@/types';

export default class GamePlayersHit extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [PLAYERS_HIT]: this.onHitPlayer,
    };
  }

  /**
   * Hit the player.
   *
   * @param victimId
   * @param projectileId
   */
  onHitPlayer(victimId: PlayerId, projectileId: MobId): void {
    /**
     * Check current game status.
     */
    if (this.storage.gameEntity.match.isActive === false) {
      return;
    }

    const now = Date.now();
    const victim = this.storage.playerList.get(victimId);

    if (victim.planestate.stealthed === true) {
      victim.planestate.stealthed = false;
      victim.times.lastStealth = now;

      this.delay(BROADCAST_EVENT_STEALTH, victim.id.current);
      this.delay(BROADCAST_PLAYER_UPDATE, victim.id.current);
    }

    if (victim.shield.current === true) {
      return;
    }

    victim.times.lastHit = now;

    const projectile = this.storage.mobList.get(projectileId);
    let { damage } = PROJECTILES_SPECS[projectile.mobtype.current];

    if (projectile.velocity.length > PROJECTILES_SPECS[projectile.mobtype.current].maxSpeed) {
      /**
       * Critical.
       * TODO: rewrite logic.
       */
      if (getRandomInt(1, 10) >= 6) {
        damage +=
          (projectile.velocity.length / PROJECTILES_SPECS[projectile.mobtype.current].maxSpeed -
            1) /
          5;
      }
    }

    /**
     * Extra damage by repel.
     */
    if (projectile.damage.double === true) {
      damage *= 2;
    }

    /**
     * Health value refers to Goliath health 1 (max among the airplanes).
     * Goliath = 1 / 1 = 1;
     * Predator = 1 / 2 = 0.5;
     * etc.
     */
    const fullAirplaneHealth =
      (1 / SHIPS_SPECS[victim.planetype.current].damageFactor) *
      UPGRADES_SPECS.DEFENSE.factor[victim.upgrades.defense];

    victim.health.current = fullAirplaneHealth * victim.health.current - damage;

    if (victim.health.current < PLAYERS_HEALTH.MIN) {
      /**
       * Player is dead.
       */
      victim.health.current = PLAYERS_HEALTH.MIN;
    } else {
      /**
       * % of the full health.
       */
      victim.health.current /= fullAirplaneHealth;
    }

    /**
     * Tracking projectile owner damage.
     */
    if (this.helpers.isPlayerConnected(projectile.owner.current)) {
      const owner = this.storage.playerList.get(projectile.owner.current);

      owner.damage.current += Math.round(
        PROJECTILES_SPECS[projectile.mobtype.current].damage * 100
      );
    }
  }
}
