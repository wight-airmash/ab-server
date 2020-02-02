import { CTF_TEAMS } from '@airbattle/protocol';
import {
  CTF_AFK_CHECK_INTERVAL_SEC,
  CTF_AFK_TIME_TO_AUTO_SPECTATE_MS,
  CTF_PLAYERS_SPAWN_ZONES,
  PLAYERS_ALIVE_STATUSES,
  PLAYERS_HEALTH,
} from '@/constants';
import {
  BROADCAST_CHAT_SERVER_WHISPER,
  PLAYERS_KILLED,
  SPECTATE_ENTER_MODE,
  TIMELINE_CLOCK_SECOND,
  TIMELINE_GAME_MATCH_START,
} from '@/events';
import Entity from '@/server/entity';
import { System } from '@/server/system';
import { PlayerId, TeamId } from '@/types';

const EXTRA_SPAWN_AREA = 100;

export default class SpawnCampingGuard extends System {
  protected secondsAfterMatchStart = 0;

  protected seconds = 0;

  protected now = 0;

  protected readonly blueSpawnBoards = {
    MIN_X:
      CTF_PLAYERS_SPAWN_ZONES[CTF_TEAMS.BLUE][0] -
      CTF_PLAYERS_SPAWN_ZONES[CTF_TEAMS.BLUE][2] -
      EXTRA_SPAWN_AREA,
    MIN_Y:
      CTF_PLAYERS_SPAWN_ZONES[CTF_TEAMS.BLUE][1] -
      CTF_PLAYERS_SPAWN_ZONES[CTF_TEAMS.BLUE][2] -
      EXTRA_SPAWN_AREA,
    MAX_X:
      CTF_PLAYERS_SPAWN_ZONES[CTF_TEAMS.BLUE][0] +
      CTF_PLAYERS_SPAWN_ZONES[CTF_TEAMS.BLUE][2] +
      EXTRA_SPAWN_AREA,
    MAX_Y:
      CTF_PLAYERS_SPAWN_ZONES[CTF_TEAMS.BLUE][1] +
      CTF_PLAYERS_SPAWN_ZONES[CTF_TEAMS.BLUE][2] +
      EXTRA_SPAWN_AREA,
  };

  protected readonly redSpawnBoards = {
    MIN_X:
      CTF_PLAYERS_SPAWN_ZONES[CTF_TEAMS.RED][0] -
      CTF_PLAYERS_SPAWN_ZONES[CTF_TEAMS.RED][2] -
      EXTRA_SPAWN_AREA,
    MIN_Y:
      CTF_PLAYERS_SPAWN_ZONES[CTF_TEAMS.RED][1] -
      CTF_PLAYERS_SPAWN_ZONES[CTF_TEAMS.RED][2] -
      EXTRA_SPAWN_AREA,
    MAX_X:
      CTF_PLAYERS_SPAWN_ZONES[CTF_TEAMS.RED][0] +
      CTF_PLAYERS_SPAWN_ZONES[CTF_TEAMS.RED][2] +
      EXTRA_SPAWN_AREA,
    MAX_Y:
      CTF_PLAYERS_SPAWN_ZONES[CTF_TEAMS.RED][1] +
      CTF_PLAYERS_SPAWN_ZONES[CTF_TEAMS.RED][2] +
      EXTRA_SPAWN_AREA,
  };

  constructor({ app }) {
    super({ app });

    this.listeners = {
      [PLAYERS_KILLED]: this.onPlayerKilled,
      [TIMELINE_CLOCK_SECOND]: this.onSecondTick,
      [TIMELINE_GAME_MATCH_START]: this.onMatchStart,
    };
  }

  protected isAtSpawn(x: number, y: number, team: TeamId): boolean {
    if (
      team === CTF_TEAMS.BLUE &&
      x < this.blueSpawnBoards.MAX_X &&
      x > this.blueSpawnBoards.MIN_X &&
      y < this.blueSpawnBoards.MAX_Y &&
      y > this.blueSpawnBoards.MIN_Y
    ) {
      return true;
    }

    if (
      team === CTF_TEAMS.RED &&
      x < this.redSpawnBoards.MAX_X &&
      x > this.redSpawnBoards.MIN_X &&
      y < this.redSpawnBoards.MAX_Y &&
      y > this.redSpawnBoards.MIN_Y
    ) {
      return true;
    }

    return false;
  }

  checkPlayer(player: Entity): void {
    if (
      player.spectate.isActive === false &&
      player.planestate.flagspeed === false &&
      this.now - player.times.lastMove > CTF_AFK_TIME_TO_AUTO_SPECTATE_MS &&
      (this.isAtSpawn(player.position.x, player.position.y, player.team.current) ||
        player.alivestatus.current === PLAYERS_ALIVE_STATUSES.DEAD)
    ) {
      this.log.debug('Trying to auto switch into spectate mode AFK player.', {
        playerId: player.id.current,
      });

      if (player.alivestatus.current === PLAYERS_ALIVE_STATUSES.ALIVE) {
        player.health.current = PLAYERS_HEALTH.MAX;
      }

      this.emit(SPECTATE_ENTER_MODE, player.id.current);

      if (player.spectate.isActive === true) {
        this.emit(
          BROADCAST_CHAT_SERVER_WHISPER,
          player.id.current,
          'You were automatically switched in spectate mode (AFK).'
        );
      }
    }
  }

  checkPlayers(): void {
    this.log.debug('Search for AFK players.');

    this.now = Date.now();
    this.storage.playerList.forEach(player => {
      this.checkPlayer(player);
    });
  }

  onPlayerKilled(victimId: PlayerId): void {
    if (this.helpers.isPlayerConnected(victimId)) {
      this.checkPlayer(this.storage.playerList.get(victimId));
    }
  }

  onMatchStart(): void {
    this.secondsAfterMatchStart = 0;
    this.seconds = 0;
  }

  onSecondTick(): void {
    this.secondsAfterMatchStart += 1;
    this.seconds += 1;

    if (this.seconds === CTF_AFK_CHECK_INTERVAL_SEC || this.secondsAfterMatchStart === 1) {
      this.seconds = 0;
      this.checkPlayers();
    }
  }
}
