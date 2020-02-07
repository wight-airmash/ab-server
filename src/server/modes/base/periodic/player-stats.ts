/**
 * player.times.createdAt
 * player.times.activePlaying
 * player.stats.matchesTotal
 * player.stats.matchesActivePlayed
 * player.kills.current
 * player.kills.bots
 * player.kills.kills.totalByInferno
 * player.kills.kills.botsByInferno
 * player.kills.carriers
 * player.kills.carriersBots
 * player.deaths.current
 * player.deaths.byBots
 * player.deaths.withFlag
 * player.deaths.withFlagByBots
 * player.current.current
 * player.captures.attempts
 * player.captures.attemptsFromBase
 * player.captures.attemptsFromBaseWithShield
 * player.captures.saves
 * player.captures.savesAfterDrop
 * player.captures.savesAfterDeath
 * player.recaptures.current
 * player.damage.current
 * player.damage.bots
 * player.damage.hits
 * player.damage.hitsToBots
 * player.damage.hitsReceived
 * player.damage.hitsByBots
 * player.stats.fires
 * player.stats.fireProjectiles
 * player.keystate.presses (total, FIRE, etc.)
 */

import { System } from '@/server/system';

export default class ExtraStatsPeriodic extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {};
  }
}
