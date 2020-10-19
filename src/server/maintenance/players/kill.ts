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
  PLAYERS_KILL_ASSISTED,
  PLAYERS_RESPAWN,
  POWERUPS_SPAWN,
  RESPONSE_KILL_ASSIST,
  RESPONSE_PLAYER_UPGRADE,
  RESPONSE_SCORE_UPDATE,
  SYNC_ENQUEUE_UPDATE,
  TIMELINE_LOOP_TICK,
} from '../../../events';
import { CHANNEL_RESPAWN_PLAYER } from '../../../events/channels';
import { getRandomInt } from '../../../support/numbers';
import { has } from '../../../support/objects';
import { MobId, Player, PlayerId, Projectile } from '../../../types';
import { System } from '../../system';

interface AggressorsListItem {
  aggressor: Player;
  bounty: number;
}

export default class GamePlayersKill extends System {
  private minScoreToDrop: number;

  private killIndex = 0;

  constructor({ app }) {
    super({ app });

    this.minScoreToDrop = UPGRADES_MIN_VICTIM_SCORE_TO_DROP[this.config.server.typeId];

    this.listeners = {
      [PLAYERS_KILL]: this.onKillPlayer,
      [TIMELINE_LOOP_TICK]: this.onTick,
    };
  }

  onTick(): void {
    this.killIndex = 0;
  }

  /**
   * Kill player.
   *
   * @param projectileId
   * @param victimId
   */
  onKillPlayer(victimId: PlayerId, projectileId: MobId): void {
    this.killIndex += 1;

    const killTimestamp = this.app.ticker.now + this.killIndex;
    const victim = this.storage.playerList.get(victimId);
    const totalKillBounty = Math.round(victim.score.current * 0.2) + 25;
    let killer: Player = null;
    let isKillerBot = false;

    const projectile =
      projectileId === 0 ? null : (this.storage.mobList.get(projectileId) as Projectile);

    const killerId = projectile === null ? 0 : projectile.owner.current;
    const killTime = Date.now();
    const aggressors: AggressorsListItem[] = [];
    const assistantsSyncData = [];

    /**
     * Kill assists processing.
     */
    if (this.config.killAssists) {
      /**
       * While `takenTraking` contains the records about damage in time,
       * the `damageDealers` has the summarised data about damage dealt.
       */
      const damageDealers: Map<PlayerId, number> = new Map();
      let victimHealthLeft = 1;

      /**
       * Filling the list of aggressors.
       */
      for (let aidx = victim.damage.takenTraking.length - 1; aidx > 0; aidx -= 2) {
        const aggressorId = victim.damage.takenTraking[aidx - 1];
        const damage = victim.damage.takenTraking[aidx];

        if (damageDealers.has(aggressorId)) {
          damageDealers.set(aggressorId, damageDealers.get(aggressorId) + damage);
        } else {
          damageDealers.set(aggressorId, damage);
        }

        victimHealthLeft -= damage;

        if (victimHealthLeft <= 0) {
          damageDealers.set(aggressorId, damageDealers.get(aggressorId) + victimHealthLeft);

          break;
        }
      }

      /**
       * Alerting aggressors about assists.
       */
      damageDealers.forEach((damage, aggressorId) => {
        let bounty = 0;

        if (damage > 1) {
          bounty = totalKillBounty;
        } else {
          // Not the most accurate way.
          bounty = Math.round(totalKillBounty * damage);
        }

        /**
         * If the aggressor has already left or it is the BTR firewall (id = 0), the bounty is lost.
         */
        if (bounty > 0 && this.storage.playerList.has(aggressorId)) {
          const aggressor = this.storage.playerList.get(aggressorId);

          if (aggressorId !== killerId) {
            if (!aggressor.delayed.RESPONSE_SCORE_UPDATE) {
              aggressor.delayed.RESPONSE_SCORE_UPDATE = true;

              if (!aggressor.bot.current) {
                this.delay(RESPONSE_KILL_ASSIST, aggressorId, victim.name.current);
              }

              this.delay(RESPONSE_SCORE_UPDATE, aggressorId);
            }

            const eventData: any = {
              name: aggressor.name.current,
              plane: aggressor.planetype.current,
              flag: aggressor.flag.current,
            };

            if (has(aggressor, 'user')) {
              eventData.user = aggressor.user.id;
            }

            if (aggressor.bot.current) {
              eventData.bot = true;
            }

            assistantsSyncData.push(eventData);
          }

          aggressors.push({
            aggressor,
            bounty,
          });
        }
      });

      victim.damage.takenTraking = [];
    }

    /**
     * Update killer stats.
     */
    if (projectileId !== 0 && this.storage.playerList.has(killerId)) {
      let earnedScore = 0;

      /**
       * If `aggressors` isn't empty and the killer is online,
       * so the first record is the killer.
       */
      if (aggressors.length > 0) {
        killer = aggressors[0].aggressor;
        earnedScore = aggressors[0].bounty;
      } else {
        killer = this.storage.playerList.get(killerId);
        earnedScore = totalKillBounty;
      }

      isKillerBot = killer.bot.current;

      killer.kills.current += 1;
      killer.kills.currentmatch += 1;

      if (projectile.inferno.current) {
        killer.kills.totalWithInferno += 1;
      }

      if (victim.bot.current) {
        killer.kills.bots += 1;

        if (projectile.inferno.current) {
          killer.kills.botsWithInferno += 1;
        }
      }

      killer.score.current += earnedScore;

      if (has(killer, 'user')) {
        const user = this.storage.users.list.get(killer.user.id);

        user.lifetimestats.totalkills += 1;
        user.lifetimestats.earnings += earnedScore;
        this.storage.users.hasChanges = true;

        if (this.config.sync.enabled) {
          const eventDetail: any = {
            timestamp: killTimestamp,
            victim: { name: victim.name.current, flag: victim.flag.current },
            projectile: projectileId,
            player: {
              plane: killer.planetype.current,
              team: killer.team.current,
              flag: killer.flag.current,
            },
          };

          if (assistantsSyncData.length > 0) {
            eventDetail.aggressors = assistantsSyncData;
          }

          if (has(victim, 'user')) {
            eventDetail.victim.user = victim.user.id;
          }

          if (victim.bot.current) {
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

    /**
     * Update aggressors stats.
     */
    for (let index = 0; index < aggressors.length; index += 1) {
      const { aggressor, bounty } = aggressors[index];

      if (aggressor.id.current === killerId) {
        continue;
      }

      aggressor.score.current += bounty;

      this.delay(PLAYERS_KILL_ASSISTED, aggressor.id.current);

      if (has(aggressor, 'user')) {
        const user = this.storage.users.list.get(aggressor.user.id);

        user.lifetimestats.earnings += bounty;
        this.storage.users.hasChanges = true;

        if (this.config.sync.enabled) {
          const eventDetail: any = {
            timestamp: killTimestamp,
            victim: { name: victim.name.current, flag: victim.flag.current },
            player: {
              plane: aggressor.planetype.current,
              team: aggressor.team.current,
              flag: aggressor.flag.current,
            },
          };

          if (has(victim, 'user')) {
            eventDetail.victim.user = victim.user.id;
          }

          if (victim.bot.current) {
            eventDetail.victim.bot = true;
          }

          if (killer !== null) {
            eventDetail.killer = { name: killer.name.current, flag: killer.flag.current };

            if (has(killer, 'user')) {
              eventDetail.killer.user = killer.user.id;
            }

            if (isKillerBot) {
              eventDetail.killer.bot = true;
            }
          }

          this.emit(
            SYNC_ENQUEUE_UPDATE,
            'user',
            aggressor.user.id,
            { earnings: bounty },
            killTime,
            ['kill-assist', eventDetail]
          );
        }
      }
    }

    /**
     * Tracking victim deaths and score.
     */
    victim.deaths.killerId = killerId;
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

      if (this.config.sync.enabled) {
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

        eventDetail.timestamp = killTimestamp;

        this.emit(SYNC_ENQUEUE_UPDATE, 'user', victim.user.id, { totaldeaths: 1 }, killTime, [
          'victim',
          eventDetail,
        ]);
      }
    }

    if (victim.score.current < 0) {
      victim.score.current = 0;
    }

    victim.alivestatus.current = PLAYERS_ALIVE_STATUSES.DEAD;
    victim.times.lastDeath = killTime;

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

        if (victim.bot.current) {
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

    this.delay(BROADCAST_PLAYER_KILL, victimId, killerId, victim.position.x, victim.position.y);
    this.delay(PLAYERS_KILLED, victimId, killerId, projectileId);
    this.delay(PLAYERS_ALIVE_UPDATE);
  }
}
