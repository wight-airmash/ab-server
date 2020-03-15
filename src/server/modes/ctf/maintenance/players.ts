import { CTF_TEAMS } from '@airbattle/protocol';
import { CTF_PLAYERS_SPAWN_ZONES } from '@/constants';
import {
  BROADCAST_PLAYER_RETEAM,
  CTF_SHUFFLE_PLAYERS,
  CTF_TEAMS_RESHUFFLED,
  PLAYERS_ASSIGN_SPAWN_POSITION,
  PLAYERS_ASSIGN_TEAM,
  PLAYERS_UPDATE_TEAM,
  TIMELINE_BEFORE_GAME_START,
} from '@/events';
import Entity from '@/server/entity';
import { System } from '@/server/system';
import { getRandomInt } from '@/support/numbers';
import { PlayerId } from '@/types';

interface ShuffleRateItem {
  id: PlayerId;
  score: number;
}

export default class GamePlayers extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [TIMELINE_BEFORE_GAME_START]: this.initTeams,
      [PLAYERS_ASSIGN_TEAM]: this.onAssignPlayerTeam,
      [PLAYERS_ASSIGN_SPAWN_POSITION]: this.onAssignPlayerSpawnPosition,
      [CTF_SHUFFLE_PLAYERS]: this.onShufflePlayers,
    };
  }

  initTeams(): void {
    this.storage.connectionIdByTeam.set(CTF_TEAMS.BLUE, new Set());
    this.storage.connectionIdByTeam.set(CTF_TEAMS.RED, new Set());

    this.log.debug('Team connections storage created.');
  }

  onAssignPlayerTeam(player: Entity): void {
    const blueTeam = this.storage.connectionIdByTeam.get(CTF_TEAMS.BLUE).size;
    const redTeam = this.storage.connectionIdByTeam.get(CTF_TEAMS.RED).size;

    this.log.debug(`Team connections: ${blueTeam}/${redTeam}`);

    if (blueTeam > redTeam) {
      player.team.current = CTF_TEAMS.RED;
    } else if (blueTeam < redTeam) {
      player.team.current = CTF_TEAMS.BLUE;
    } else {
      player.team.current = getRandomInt(0, 1) === 0 ? CTF_TEAMS.BLUE : CTF_TEAMS.RED;
    }
  }

  onAssignPlayerSpawnPosition(player: Entity): void {
    let x = 0;
    let y = 0;
    let r = 0;

    if (player.team.current === CTF_TEAMS.BLUE) {
      [x, y, r] = CTF_PLAYERS_SPAWN_ZONES[CTF_TEAMS.BLUE];
    } else if (player.team.current === CTF_TEAMS.RED) {
      [x, y, r] = CTF_PLAYERS_SPAWN_ZONES[CTF_TEAMS.RED];
    } else {
      x = 0;
      y = 0;

      this.log.warn('Unknown player ctf team.');
    }

    player.position.x = x + getRandomInt(-r, r);
    player.position.y = y + getRandomInt(-r, r);
  }

  onShufflePlayers(): void {
    const shuffleRateList: ShuffleRateItem[] = [];
    const totalPlayers = this.storage.playerList.size;

    if (totalPlayers === 0) {
      return;
    }

    let kills = 0;
    let deaths = 0;
    let damage = 0;
    let carriersKills = 0;
    let carriersKillsPlayers = 0;
    let deathsWithFlag = 0;
    let deathsWithFlagPlayers = 0;
    let capAttempts = 0;
    let capAttemptsPlayers = 0;
    let capSaves = 0;
    let capSavesPlayers = 0;
    let successCaps = 0;
    let successCapsPlayers = 0;
    let recaptures = 0;
    let recapturesPlayers = 0;

    this.storage.playerList.forEach(player => {
      kills += player.kills.current;
      deaths += player.deaths.current;
      damage += player.damage.current;

      if (player.kills.carriers > 0) {
        carriersKills += player.kills.carriers;
        carriersKillsPlayers += 1;
      }

      if (player.deaths.withFlag > 0) {
        deathsWithFlag += player.deaths.withFlag;
        deathsWithFlagPlayers += 1;
      }

      if (player.captures.attempts > 0) {
        capAttempts += player.captures.attempts;
        capAttemptsPlayers += 1;
      }

      if (player.captures.saves > 0) {
        capSaves += player.captures.saves;
        capSavesPlayers += 1;
      }

      if (player.captures.current > 0) {
        successCaps += player.captures.current;
        successCapsPlayers += 1;
      }

      if (player.recaptures.current > 0) {
        recaptures += player.recaptures.current;
        recapturesPlayers += 1;
      }
    });

    if (deaths === 0) {
      deaths = 1;
    }

    if (carriersKillsPlayers === 0) {
      carriersKillsPlayers = 1;
    }

    if (deathsWithFlagPlayers === 0) {
      deathsWithFlagPlayers = 1;
    }

    if (capAttemptsPlayers === 0) {
      capAttemptsPlayers = 1;
    }

    if (capSavesPlayers === 0) {
      capSavesPlayers = 1;
    }

    if (successCapsPlayers === 0) {
      successCapsPlayers = 1;
    }

    if (recapturesPlayers === 0) {
      recapturesPlayers = 1;
    }

    this.log.debug('Average shuffle scores.', {
      kd: kills / deaths,
      kills,
      deaths,
      damage: damage / totalPlayers,
      ck: carriersKills / carriersKillsPlayers,
      dwf: deathsWithFlag / deathsWithFlagPlayers,
      captures: successCaps / successCapsPlayers,
      attempts: capAttempts / capAttemptsPlayers,
      saves: capSaves / capSavesPlayers,
      recaptures: recaptures / recapturesPlayers,
    });

    this.storage.playerList.forEach(player => {
      const kd = player.kills.current / (player.deaths.current === 0 ? 1 : player.deaths.current);
      let score = 1;

      if (kd >= kills / deaths) {
        score += 1;
      }

      if (player.damage.current >= damage / totalPlayers) {
        score += 1;
      }

      if (player.kills.carriers >= carriersKills / carriersKillsPlayers) {
        score += 1;
      }

      if (player.deaths.withFlag < deathsWithFlag / deathsWithFlagPlayers) {
        score += 1;
      }

      if (player.captures.current >= successCaps / successCapsPlayers) {
        score += 1;
      }

      if (player.captures.attempts >= capAttempts / capAttemptsPlayers) {
        score += 1;
      }

      if (player.captures.saves >= capSaves / capSavesPlayers) {
        score += 1;
      }

      if (player.recaptures.current >= recaptures / recapturesPlayers) {
        score += 1;
      }

      shuffleRateList.push({
        id: player.id.current,
        score,
      });

      this.log.debug(`Player "${player.name.current}" id${player.id.current} shuffle scores`, {
        score,
        kd,
        kills: player.kills.current,
        deaths: player.deaths.current,
        damage: player.damage.current,
        ck: player.kills.carriers,
        dwf: player.deaths.withFlag,
        captures: player.captures.current,
        attempts: player.captures.attempts,
        saves: player.captures.saves,
        recaptures: player.recaptures.current,
      });
    });

    shuffleRateList.sort((p1, p2) => p2.score - p1.score);

    let nextTeamId = CTF_TEAMS.RED;

    if (getRandomInt(0, 1) === 0) {
      nextTeamId = CTF_TEAMS.BLUE;
    }

    this.log.debug(`Shuffle, start team ${nextTeamId}.`);

    for (let index = 0; index < shuffleRateList.length; index += 1) {
      this.emit(PLAYERS_UPDATE_TEAM, shuffleRateList[index].id, nextTeamId);

      this.log.debug(
        `Shuffle, player id${shuffleRateList[index].id} shuffled to the team id${nextTeamId}.`
      );

      nextTeamId = nextTeamId === CTF_TEAMS.RED ? CTF_TEAMS.BLUE : CTF_TEAMS.RED;

      this.log.debug(`Shuffle, next team ${nextTeamId}.`);
    }

    this.emit(
      BROADCAST_PLAYER_RETEAM,
      shuffleRateList.map(player => player.id)
    );

    this.emit(CTF_TEAMS_RESHUFFLED);
  }
}
