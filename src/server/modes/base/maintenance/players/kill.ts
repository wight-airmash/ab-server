import { GAME_TYPES, MOB_TYPES } from '@airbattle/protocol';
import {
  COLLISIONS_MAP_COORDS,
  PLAYERS_ALIVE_STATUSES,
  PLAYERS_DEATH_INACTIVITY_MS,
  UPGRADES_ACTION_TYPE,
  UPGRADES_MIN_VICTIM_SCORE_TO_DROP,
} from '@/constants';
import {
  BROADCAST_PLAYER_KILL,
  CTF_CARRIER_KILLED,
  PLAYERS_ALIVE_UPDATE,
  PLAYERS_KILL,
  PLAYERS_KILLED,
  PLAYERS_RESPAWN,
  POWERUPS_SPAWN,
  RESPONSE_PLAYER_UPGRADE,
} from '@/events';
import { CHANNEL_RESPAWN_PLAYER } from '@/server/channels';
import Entity from '@/server/entity';
import { System } from '@/server/system';
import { getRandomInt } from '@/support/numbers';
import { has } from '@/support/objects';
import { MobId, PlayerId } from '@/types';

export default class GamePlayersKill extends System {
  private minScoreToDrop: number;

  constructor({ app }) {
    super({ app });

    this.minScoreToDrop = UPGRADES_MIN_VICTIM_SCORE_TO_DROP[this.app.config.server.typeId];

    this.listeners = {
      [PLAYERS_KILL]: this.onKillPlayer,
    };
  }

  /**
   * Kill player.
   *
   * @param projectileId
   * @param victimId
   */
  onKillPlayer(victimId: PlayerId, projectileId: MobId): void {
    let killer: Entity = null;
    let projectileOwner: PlayerId = 0;
    const victim = this.storage.playerList.get(victimId);

    if (projectileId !== 0) {
      const projectile = this.storage.mobList.get(projectileId);

      projectileOwner = projectile.owner.current;

      this.log.debug(`Player id${victimId} was killed by player id${projectile.owner.current}.`);

      /**
       * Tracking killer kills and score.
       * Damage was already updated on hit event.
       */
      if (this.storage.playerList.has(projectile.owner.current)) {
        killer = this.storage.playerList.get(projectile.owner.current);

        killer.kills.current += 1;
        killer.kills.currentmatch += 1;
        const earnedScore = Math.round(victim.score.current * 0.2) + 25;

        killer.score.current += earnedScore;

        if (has(killer, 'user')) {
          const user = this.storage.userList.get(killer.user.id);

          user.lifetimestats.totalkills += 1;
          user.lifetimestats.earnings += earnedScore;
        }
      }
    } else {
      this.log.debug(`Player id${victimId} was killed by the firewall.`);
    }

    /**
     * Tracking victim deaths and score.
     */
    victim.deaths.current += 1;
    victim.score.current = Math.round(victim.score.current * 0.8) - 5;

    if (has(victim, 'user')) {
      const user = this.storage.userList.get(victim.user.id);

      user.lifetimestats.totaldeaths += 1;
    }

    if (victim.score.current < 0) {
      victim.score.current = 0;
    }

    victim.alivestatus.current = PLAYERS_ALIVE_STATUSES.DEAD;
    victim.times.lastDeath = Date.now();

    /**
     * Victim upgrades reset.
     * 50% to save an extra upgrade.
     */
    let isUpgradesLost = false;

    if (victim.upgrades.speed > 0) {
      const rand = getRandomInt(0, 1);

      isUpgradesLost = true;
      victim.upgrades.speed = Math.floor((victim.upgrades.speed + rand) / 2);
    }

    if (victim.upgrades.defense > 0) {
      const rand = getRandomInt(0, 1);

      isUpgradesLost = true;
      victim.upgrades.defense = Math.floor((victim.upgrades.defense + rand) / 2);
    }

    if (victim.upgrades.energy > 0) {
      const rand = getRandomInt(0, 1);

      isUpgradesLost = true;
      victim.upgrades.energy = Math.floor((victim.upgrades.energy + rand) / 2);
    }

    if (victim.upgrades.missile > 0) {
      const rand = getRandomInt(0, 1);

      isUpgradesLost = true;
      victim.upgrades.missile = Math.floor((victim.upgrades.missile + rand) / 2);
    }

    /**
     * Drop an upgrade.
     *
     * The chance to drop increases with victim upgrades amount.
     * The maximum increase at a value greater than 99.
     */
    if (victim.score.current >= this.minScoreToDrop) {
      const amountExtraChance = victim.upgrades.amount > 100 ? 1 : victim.upgrades.amount / 100;
      const kills = victim.kills.current > 0 ? victim.kills.current : 1;
      const deaths = victim.deaths.current > 0 ? victim.deaths.current : 1;
      const kd = kills / deaths;
      const kdMultiplier = kd > 1 ? 1 : kd;
      const chance =
        this.app.config.upgradesDropMinChance +
        (this.app.config.upgradesDropMaxChance - this.app.config.upgradesDropMinChance) *
          amountExtraChance *
          kdMultiplier;

      this.log.debug(`Player id${victim.id.current} upgrade drop chance is ${chance}`, {
        amountExtraChance,
        kills,
        deaths,
        kdMultiplier,
      });

      if (getRandomInt(1, 100) > 100 * (1 - chance)) {
        this.delay(POWERUPS_SPAWN, {
          mobId: this.helpers.createMobId(),
          type: MOB_TYPES.UPGRADE,
          posX: ~~victim.position.x,
          posY: ~~victim.position.y,
          ownerId: victim.id.current,
        });
      }
    }

    /**
     * CTF stats & event.
     */
    if (victim.planestate.flagspeed === true) {
      victim.deaths.withFlag += 1;
      this.emit(CTF_CARRIER_KILLED, victimId);

      if (killer !== null) {
        killer.kills.carriers += 1;
      }
    }

    /**
     * Delay respawn.
     */
    if (this.app.config.server.typeId !== GAME_TYPES.BTR) {
      if (this.storage.connectionList.has(this.storage.playerMainConnectionList.get(victimId))) {
        const connection = this.storage.connectionList.get(
          this.storage.playerMainConnectionList.get(victimId)
        );

        connection.meta.pending.respawn = true;

        /**
         * TODO: it's a temporary fix, inspect.
         */
        connection.meta.timeouts.respawn = setTimeout(() => {
          this.channel(CHANNEL_RESPAWN_PLAYER).delay(PLAYERS_RESPAWN, victimId);
        }, PLAYERS_DEATH_INACTIVITY_MS + 100);
      }
    }

    /**
     * Move player hitbox outside of the map.
     */
    victim.hitbox.current.x = COLLISIONS_MAP_COORDS.MAX_X + 1000;
    victim.hitbox.current.y = COLLISIONS_MAP_COORDS.MAX_Y + 1000;

    if (isUpgradesLost === true) {
      this.delay(RESPONSE_PLAYER_UPGRADE, victimId, UPGRADES_ACTION_TYPE.LOST);
    }

    this.delay(
      BROADCAST_PLAYER_KILL,
      victimId,
      projectileOwner,
      victim.position.x,
      victim.position.y
    );

    this.delay(PLAYERS_KILLED, victimId, projectileOwner, projectileId);
    this.delay(PLAYERS_ALIVE_UPDATE);
  }
}
