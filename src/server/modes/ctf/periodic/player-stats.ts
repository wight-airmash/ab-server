import { CTF_TEAMS } from '@airbattle/protocol';
import { mkdirSync, readdirSync, unlinkSync, writeFile } from 'fs';
import { join as joinPath, parse as parsePath } from 'path';
import {
  HOURS_PER_DAY,
  MINUTES_PER_HOUR,
  MS_PER_SEC,
  PLAYERS_ALIVE_STATUSES,
  SECONDS_PER_MINUTE,
} from '@/constants';
import {
  PLAYERS_BEFORE_REMOVE,
  TIMELINE_BEFORE_GAME_START,
  TIMELINE_CLOCK_DAY,
  TIMELINE_CLOCK_HOUR,
  TIMELINE_CLOCK_SECOND,
  TIMELINE_GAME_MATCH_END,
  TIMELINE_GAME_MATCH_START,
} from '@/events';
import Entity from '@/server/entity';
import { System } from '@/server/system';
import { median } from '@/support/numbers';
import { PlayerId } from '@/types';

type Metrics = Map<PlayerId, number[]>;

export default class ExtraStatsPeriodic extends System {
  private readonly blueBase = {
    x: -8930,
    y: -1440,
  };

  private readonly redBase = {
    x: 7950,
    y: -940,
  };

  private readonly saveDir = joinPath(this.app.config.cache.path, 'matches');

  private readonly fileSaveDelaySec = 3;

  protected shouldSaveStats = false;

  protected seconds = 0;

  protected hours = 0;

  protected distanceToOwnBase: Metrics = new Map();

  protected distanceToEnemyBase: Metrics = new Map();

  protected ping: Metrics = new Map();

  protected playersStats = new Map();

  constructor({ app }) {
    super({ app });

    this.listeners = {
      [PLAYERS_BEFORE_REMOVE]: this.onPlayerDisconnected,
      [TIMELINE_BEFORE_GAME_START]: this.prepareSaveDirectory,
      [TIMELINE_CLOCK_DAY]: this.deleteOldFiles,
      [TIMELINE_CLOCK_HOUR]: this.onHourTick,
      [TIMELINE_CLOCK_SECOND]: this.onSecondTick,
      [TIMELINE_GAME_MATCH_END]: this.onMatchEnd,
      [TIMELINE_GAME_MATCH_START]: this.onMatchStart,
    };
  }

  protected static getDistanceToBase(
    posX: number,
    posY: number,
    baseX: number,
    baseY: number
  ): number {
    return ~~Math.hypot(baseX - posX, baseY - posY);
  }

  protected getDistanceToBlueBase(posX: number, posY: number): number {
    return ExtraStatsPeriodic.getDistanceToBase(posX, posY, this.blueBase.x, this.blueBase.y);
  }

  protected getDistanceToRedBase(posX: number, posY: number): number {
    return ExtraStatsPeriodic.getDistanceToBase(posX, posY, this.redBase.x, this.redBase.y);
  }

  protected clearMetricSamples(): void {
    this.distanceToOwnBase.clear();
    this.distanceToEnemyBase.clear();
    this.ping.clear();
  }

  protected reduceSamplesArray(values: number[], playerId: PlayerId): void {
    if (this.storage.playerList.has(playerId) === true && values.length > 239) {
      values.sort((a, b) => a - b);

      const quarter = ~~(values.length / 4);

      values.splice(values.length - quarter);
      values.splice(0, quarter);
    }
  }

  protected reduceMetricSamples(): void {
    this.ping.forEach((values, playerId) => {
      this.reduceSamplesArray(values, playerId);
    });

    this.distanceToOwnBase.forEach((values, playerId) => {
      this.reduceSamplesArray(values, playerId);
    });

    this.distanceToEnemyBase.forEach((values, playerId) => {
      this.reduceSamplesArray(values, playerId);
    });

    this.log.debug('Metric samples reduced.');
  }

  protected storePlayerStats(player: Entity, disconnectTime = 0): void {
    this.playersStats.set(player.id.current, {
      id: player.id.current,
      t: player.team.current,
      nm: player.flag.current,
      f: player.name.current,
      pt: player.planetype.current,
      ct: player.times.createdAt,
      jt: player.times.joinedAt,
      dt: disconnectTime,
      ap: player.times.activePlaying,
      apb: player.times.activePlayingBlue,
      apr: player.times.activePlayingRed,
      m: player.stats.matchesTotal,
      map: player.stats.matchesActivePlayed,
      b: player.score.current,
      k: player.kills.current,
      kb: player.kills.bots,
      ki: player.kills.totalWithInferno,
      kbi: player.kills.botsWithInferno,
      kc: player.kills.carriers,
      kcb: player.kills.carriersBots,
      d: player.deaths.current,
      db: player.deaths.byBots,
      df: player.deaths.withFlag,
      dfb: player.deaths.withFlagByBots,
      cp: player.captures.current,
      cpa: player.captures.attempts,
      cpab: player.captures.attemptsFromBase,
      cpabs: player.captures.attemptsFromBaseWithShield,
      cps: player.captures.saves,
      cpsd: player.captures.savesAfterDeath,
      cpsdr: player.captures.savesAfterDrop,
      cpt: player.captures.time,
      rcp: player.recaptures.current,
      dm: player.damage.current,
      dmb: player.damage.bots,
      dmh: player.damage.hits,
      dmhb: player.damage.hitsToBots,
      dmhr: player.damage.hitsReceived,
      dmhrb: player.damage.hitsByBots,
      fr: player.stats.fires,
      frp: player.stats.fireProjectiles,
      pr: player.keystate.presses.total,
      prf: player.keystate.presses.FIRE,
      pru: player.keystate.presses.UP,
      prr: player.keystate.presses.RIGHT,
      prd: player.keystate.presses.DOWN,
      prl: player.keystate.presses.LEFT,
      prs: player.keystate.presses.SPECIAL,
      upg: player.upgrades.collected,
      upgu: player.upgrades.used,
      sh: player.shield.collected,
      inf: player.inferno.collected,
      w: player.wins.current,
      swt: player.stats.switches,
      hx: player.horizon.x,
      hy: player.horizon.x,
      hxv: player.horizon.validX,
      hyv: player.horizon.validY,
      p: 0,
      bo: 0,
      be: 0,
    });
  }

  protected storePlayersStats(): void {
    this.storage.playerList.forEach(player => {
      this.storePlayerStats(player);
    });
  }

  protected saveStatsToFile(): void {
    this.shouldSaveStats = false;

    const playersStats = [];

    this.playersStats.forEach(playerStat => {
      if (this.ping.has(playerStat.id) === true) {
        // eslint-disable-next-line no-param-reassign
        playerStat.p = median(this.ping.get(playerStat.id));
      }

      if (this.distanceToOwnBase.has(playerStat.id) === true) {
        // eslint-disable-next-line no-param-reassign
        playerStat.bo = median(this.distanceToOwnBase.get(playerStat.id));
      }

      if (this.distanceToEnemyBase.has(playerStat.id) === true) {
        // eslint-disable-next-line no-param-reassign
        playerStat.be = median(this.distanceToEnemyBase.get(playerStat.id));
      }

      playersStats.push(playerStat);
    });

    const now = Date.now();
    const fileName = `${now}.json`;
    let content = '{"error":"serialising error"}';

    try {
      content = JSON.stringify({
        m: this.storage.gameEntity.match.current,
        s: this.storage.gameEntity.match.start,
        d: now - this.storage.gameEntity.match.start - this.fileSaveDelaySec * MS_PER_SEC,
        w: this.storage.gameEntity.match.winnerTeam,
        b: this.storage.gameEntity.match.blue,
        r: this.storage.gameEntity.match.red,
        p: playersStats,
      });
    } catch (err) {
      this.log.error(`Error while serialising players stats.`, err.stack);
    }

    writeFile(joinPath(this.saveDir, fileName), content, err => {
      if (err) {
        this.log.error(`Error while saving players stats.`, err.stack);
      }
    });

    this.playersStats.clear();
    this.clearMetricSamples();
  }

  deleteOldFiles(): void {
    this.log.debug('Deleting old samples files.');

    const outdatedAt =
      Date.now() - HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SEC;

    try {
      readdirSync(this.saveDir).forEach(file => {
        const { name } = parsePath(file);

        if (parseInt(name, 10) < outdatedAt) {
          try {
            unlinkSync(joinPath(this.saveDir, file));
          } catch (err) {
            this.log.error(`Error while deleting ${file}`, err.stack);
          }
        }
      });
    } catch (err) {
      this.log.error(`Error while reading ${this.saveDir}`, err.stack);
    }
  }

  prepareSaveDirectory(): void {
    mkdirSync(this.saveDir, { recursive: true });

    this.deleteOldFiles();
  }

  onPlayerDisconnected(player: Entity): void {
    this.storePlayerStats(player, Date.now());
  }

  storePlayersMetricSample(): void {
    this.storage.playerList.forEach(player => {
      const playerId = player.id.current;

      if (
        this.storage.botIdList.has(playerId) === false &&
        player.alivestatus.current === PLAYERS_ALIVE_STATUSES.ALIVE
      ) {
        let distanceToOwnBase = 0;
        let distanceToEnemyBase = 0;

        if (player.team.current === CTF_TEAMS.BLUE) {
          distanceToOwnBase = this.getDistanceToBlueBase(player.position.x, player.position.y);
          distanceToEnemyBase = this.getDistanceToRedBase(player.position.x, player.position.y);
        } else {
          distanceToOwnBase = this.getDistanceToRedBase(player.position.x, player.position.y);
          distanceToEnemyBase = this.getDistanceToBlueBase(player.position.x, player.position.y);
        }

        if (this.distanceToOwnBase.has(playerId)) {
          this.distanceToOwnBase.get(playerId).push(distanceToOwnBase);
        } else {
          this.distanceToOwnBase.set(playerId, [distanceToOwnBase]);
        }

        if (this.distanceToEnemyBase.has(playerId)) {
          this.distanceToEnemyBase.get(playerId).push(distanceToEnemyBase);
        } else {
          this.distanceToEnemyBase.set(playerId, [distanceToEnemyBase]);
        }

        if (this.ping.has(playerId)) {
          this.ping.get(playerId).push(player.ping.current);
        } else {
          this.ping.set(playerId, [player.ping.current]);
        }
      }
    });
  }

  onHourTick(): void {
    this.hours += 1;

    if (this.storage.gameEntity.match.isActive === false) {
      return;
    }

    /**
     * Don't let the in-memory data get too big. Reduce every 2 hours.
     */
    if (this.hours === 2) {
      this.hours = 0;
      this.reduceMetricSamples();
    }
  }

  onSecondTick(): void {
    if (this.shouldSaveStats === true && this.seconds === 2) {
      this.storePlayersStats();
    } else if (this.shouldSaveStats === true && this.seconds === this.fileSaveDelaySec) {
      this.saveStatsToFile();
    }

    this.seconds += 1;

    if (this.storage.gameEntity.match.isActive === false) {
      return;
    }

    if (this.seconds === 15) {
      this.storePlayersMetricSample();
      this.seconds = 0;
    }
  }

  onMatchStart(): void {
    this.seconds = 0;
    this.hours = 0;
  }

  onMatchEnd(): void {
    this.seconds = 0;
    this.shouldSaveStats = true;
  }
}
