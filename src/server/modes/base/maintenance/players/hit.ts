import {
  PLAYERS_HEALTH,
  PROJECTILES_EXTRA_SPEED_TO_DAMAGE_FACTOR,
  PROJECTILES_SPECS,
  SHIPS_SPECS,
  UPGRADES_SPECS,
} from '@/constants';
import { BROADCAST_EVENT_STEALTH, BROADCAST_PLAYER_UPDATE, PLAYERS_HIT } from '@/events';
import { System } from '@/server/system';
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
   * @param firewallDamage used if projectileId is zero
   */
  onHitPlayer(victimId: PlayerId, projectileId: MobId, firewallDamage: number): void {
    /**
     * Check current game status.
     */
    if (this.storage.gameEntity.match.isActive === false) {
      return;
    }

    const now = Date.now();
    const victim = this.storage.playerList.get(victimId);
    let damage: number;

    if (victim.planestate.stealthed === true) {
      victim.planestate.stealthed = false;
      victim.times.lastStealth = now;

      this.delay(BROADCAST_EVENT_STEALTH, victim.id.current);
      this.delay(BROADCAST_PLAYER_UPDATE, victim.id.current);
    }

    if (projectileId === 0) {
      /**
       * Projectile zero is the BTR firewall
       */
      damage = firewallDamage;
    } else {
      if (victim.shield.current === true) {
        return;
      }

      victim.times.lastHit = now;

      const projectile = this.storage.mobList.get(projectileId);
      const scalar =
        projectile.velocity.x * victim.velocity.x + projectile.velocity.y * victim.velocity.y;
      const { maxSpeed } = PROJECTILES_SPECS[projectile.mobtype.current];

      damage = PROJECTILES_SPECS[projectile.mobtype.current].damage;
      let extraDamageFactor = 1;

      /**
       * Projectile upgrades increase the damage.
       */
      if (projectile.velocity.length > maxSpeed) {
        const extraSpeed = projectile.velocity.length - maxSpeed;

        extraDamageFactor += extraSpeed * PROJECTILES_EXTRA_SPEED_TO_DAMAGE_FACTOR;

        this.log.debug(`Extra damage by upgrades: ${extraDamageFactor - 1}`);
      }

      /**
       * Damage increases or decreases depending on the collision speed.
       */
      {
        /**
         * 0.25 — max upgrade factor.
         */
        const maxExtraSpeed = maxSpeed * 0.25 * 2;
        let extraSpeed = -scalar / projectile.velocity.length;

        if (Math.abs(extraSpeed) > maxExtraSpeed) {
          extraSpeed = Math.sign(extraSpeed) * maxExtraSpeed;
        }

        extraDamageFactor += extraSpeed * PROJECTILES_EXTRA_SPEED_TO_DAMAGE_FACTOR;

        this.log.debug(
          `Extra damage by direction: ${extraSpeed * PROJECTILES_EXTRA_SPEED_TO_DAMAGE_FACTOR}`
        );
      }

      this.log.debug(`Extra damage factor: ${extraDamageFactor}`);
      this.log.debug(`Projectile damage before extra: ${damage}`);

      damage *= extraDamageFactor;

      this.log.debug(`Projectile damage after extra: ${damage}`);

      /**
       * Extra damage by repel.
       */
      if (projectile.damage.double === true) {
        damage *= 2;
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

    /**
     * Health value refers to Goliath health 1 (max among the airplanes).
     * Goliath = 1 / 1 = 1;
     * Predator = 1 / 2 = 0.5;
     * etc.
     */
    const fullAirplaneHealth =
      (1 / SHIPS_SPECS[victim.planetype.current].damageFactor) *
      UPGRADES_SPECS.DEFENSE.factor[victim.upgrades.defense];

    this.log.debug('Victim health before hit', fullAirplaneHealth * victim.health.current);
    victim.health.current = fullAirplaneHealth * victim.health.current - damage;
    this.log.debug('Victim health after hit', victim.health.current);

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
  }
}
