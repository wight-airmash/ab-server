import { GAME_TYPES, MOB_TYPES } from '@airbattle/protocol';
import {
  COLLISIONS_MAP_COORDS,
  PLAYERS_ALIVE_STATUSES,
  PLAYERS_DEATH_INACTIVITY_MS,
  UPGRADES_ACTION_TYPE,
  UPGRADES_MIN_VICTIM_SCORE_TO_DROP,
} from '../../../constants';
import {
  BROADCAST_PLAYER_KILL,
  CTF_CARRIER_KILLED,
  PLAYERS_ALIVE_UPDATE,
  PLAYERS_KILL,
  PLAYERS_KILLED,
  PLAYERS_RESPAWN,
  POWERUPS_SPAWN,
  RESPONSE_PLAYER_UPGRADE,
  SYNC_ENQUEUE_UPDATE,
} from '../../../events';
import { CHANNEL_RESPAWN_PLAYER } from '../../../events/channels';
import { getRandomInt } from '../../../support/numbers';
import { has } from '../../../support/objects';
import { MobId, Player, PlayerId, Projectile } from '../../../types';
import { System } from '../../system';

export default class GamePlayersKill extends System {
  private minScoreToDrop: number;

  constructor({ app }) {
    super({ app });

    this.minScoreToDrop = UPGRADES_MIN_VICTIM_SCORE_TO_DROP[this.config.server.typeId];

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
    const isVictimBot = this.storage.botIdList.has(victimId);
    let isKillerBot = false;
    let killer: Player = null;
    let projectileOwner: PlayerId = 0;
    const victim = this.storage.playerList.get(victimId);
    const killTime = Date.now();

    if (projectileId !== 0) {
      const projectile = this.storage.mobList.get(projectileId) as Projectile;

      projectileOwner = projectile.owner.current;

      /**
       * Tracking killer kills and score.
       * Damage was already updated on hit event.
       */
      if (this.storage.playerList.has(projectile.owner.current)) {
        killer = this.storage.playerList.get(projectile.owner.current);
        isKillerBot = this.storage.botIdList.has(killer.id.current);

        killer.kills.current += 1;
        killer.kills.currentmatch += 1;

        if (projectile.inferno.current) {
          killer.kills.totalWithInferno += 1;
        }

        if (isVictimBot) {
          killer.kills.bots += 1;

          if (projectile.inferno.current) {
            killer.kills.botsWithInferno += 1;
          }
        }

        const earnedScore = Math.round(victim.score.current * 0.2) + 25;

        killer.score.current += earnedScore;

        if (has(killer, 'user')) {
          const user = this.storage.users.list.get(killer.user.id);

          user.lifetimestats.totalkills += 1;
          user.lifetimestats.earnings += earnedScore;
          this.storage.users.hasChanges = true;

          if (this.config.accounts.userStats.synchronize) {
            const eventDetail: any = {
              victim: { name: victim.name.current, flag: victim.flag.current },
              projectile: projectileId,
              player: {
                plane: killer.planetype.current,
                team: killer.team.current,
                flag: killer.flag.current,
              },
            };

            if (has(victim, 'user')) {
              eventDetail.victim.user = victim.user.id;
            }

            if (isVictimBot) {
              eventDetail.victim.bot = true;
            }

            this.emit(
              SYNC_ENQUEUE_UPDATE,
              'user',
              killer.user.id,
              { earnings: earnedScore, totalkills: 1 },
              killTime,
              ['killer', eventDetail]
            );
          }
        }
      }
    }

    /**
     * Tracking victim deaths and score.
     */
    victim.deaths.killerId = projectileOwner;
    victim.deaths.current += 1;

    if (killer !== null && isKillerBot) {
      victim.deaths.byBots += 1;
    }

    const victimScoreBeforeDeath = victim.score.current;

    victim.score.current = Math.round(victim.score.current * 0.8) - 5;

    if (has(victim, 'user')) {
      const user = this.storage.users.list.get(victim.user.id);

      user.lifetimestats.totaldeaths += 1;
      this.storage.users.hasChanges = true;

      if (this.config.accounts.userStats.synchronize) {
        const eventDetail: any = {};

        if (killer !== null) {
          eventDetail.killer = { name: killer.name.current, flag: killer.flag.current };

          if (has(killer, 'user')) {
            eventDetail.killer.user = killer.user.id;
          }

          if (isKillerBot) {
            eventDetail.killer.bot = true;
          }
        }

        eventDetail.projectile = projectileId;
        eventDetail.player = {
          plane: victim.planetype.current,
          team: victim.team.current,
          flag: victim.flag.current,
        };

        this.emit(
          SYNC_ENQUEUE_UPDATE,
          'user',
          victim.user.id,
          { totaldeaths: 1 },
          killTime,
          ['victim', eventDetail]
        );
      }
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
    if (victimScoreBeforeDeath >= this.minScoreToDrop) {
      let chance = this.config.upgrades.minChance;

      if (!victim.bot.current) {
        const amountExtraChance = victim.upgrades.amount > 100 ? 1 : victim.upgrades.amount / 100;

        chance += (this.config.upgrades.maxChance - chance) * amountExtraChance;
      }

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
    if (victim.planestate.flagspeed) {
      victim.deaths.withFlag += 1;
      this.emit(CTF_CARRIER_KILLED, victimId);

      if (killer !== null) {
        killer.kills.carriers += 1;

        if (isKillerBot) {
          victim.deaths.withFlagByBots += 1;
        }

        if (isVictimBot) {
          killer.kills.carriersBots += 1;
        }
      }
    }

    /**
     * Delay respawn.
     */
    if (this.config.server.typeId !== GAME_TYPES.BTR) {
      if (this.storage.connectionList.has(this.storage.playerMainConnectionList.get(victimId))) {
        const connection = this.storage.connectionList.get(
          this.storage.playerMainConnectionList.get(victimId)
        );

        connection.pending.respawn = true;

        /**
         * TODO: it's a temporary fix, inspect.
         */
        connection.timeouts.respawn = setTimeout(() => {
          this.channel(CHANNEL_RESPAWN_PLAYER).delay(PLAYERS_RESPAWN, victimId);
        }, PLAYERS_DEATH_INACTIVITY_MS + 100);
      }
    }

    /**
     * Move player hitbox outside of the map.
     */
    victim.hitbox.current.x = COLLISIONS_MAP_COORDS.MAX_X + 1000;
    victim.hitbox.current.y = COLLISIONS_MAP_COORDS.MAX_Y + 1000;

    this.storage.playerIdSayBroadcastList.delete(victimId);

    if (isUpgradesLost) {
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
