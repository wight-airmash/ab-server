import { CTF_TEAMS, CTF_WIN_BOUNTY, SERVER_MESSAGE_TYPES } from '@airbattle/protocol';
import {
  CTF_COUNTDOWN_DURATION_MS,
  CTF_FLAGS_STATE_TO_NEW_PLAYER_BROADCAST_DELAY_MS,
  CTF_NEW_GAME_ALERT_DURATION_MS,
  MS_PER_SEC,
} from '@/constants';
import {
  BROADCAST_CHAT_SERVER_PUBLIC,
  BROADCAST_GAME_FLAG,
  BROADCAST_PLAYER_UPDATE,
  BROADCAST_SERVER_CUSTOM,
  BROADCAST_SERVER_MESSAGE,
  PLAYERS_CREATED,
  PLAYERS_RESPAWN,
  CTF_RESET_FLAGS,
  RESPONSE_SCORE_UPDATE,
  CTF_SHUFFLE_PLAYERS,
  CTF_TEAM_CAPTURED_FLAG,
  TIMELINE_CLOCK_SECOND,
  TIMELINE_GAME_MATCH_START,
} from '@/events';
import { System } from '@/server/system';
import { PlayerId, TeamId } from '@/types';

export default class GameMatches extends System {
  private timeout = 0;

  constructor({ app }) {
    super({ app });

    this.listeners = {
      [TIMELINE_CLOCK_SECOND]: this.onSecondTick,
      [PLAYERS_CREATED]: this.announceMatchState,
      [CTF_TEAM_CAPTURED_FLAG]: this.onTeamCaptured,
    };
  }

  onSecondTick(): void {
    if (this.storage.gameEntity.match.isActive === false) {
      this.timeout += 1;

      if (this.timeout === 15) {
        // TODO: not sure about message type.
        this.emit(
          BROADCAST_SERVER_MESSAGE,
          'New game starting in 1 minute',
          SERVER_MESSAGE_TYPES.ALERT,
          CTF_NEW_GAME_ALERT_DURATION_MS
        );
      } else if (this.timeout === 30) {
        // TODO: not sure about message type.
        this.emit(
          BROADCAST_SERVER_MESSAGE,
          'Game starting in 30 seconds - shuffling teams',
          SERVER_MESSAGE_TYPES.ALERT,
          5 * MS_PER_SEC
        );

        this.emit(CTF_SHUFFLE_PLAYERS);
      } else if (this.timeout === 50) {
        // TODO: not sure about message type.
        this.emit(
          BROADCAST_SERVER_MESSAGE,
          'Game starting in 10 seconds',
          SERVER_MESSAGE_TYPES.ALERT,
          4 * MS_PER_SEC
        );
      } else if (this.timeout >= 55 && this.timeout < 60) {
        const left = 60 - this.timeout;
        let text = 'Game starting in a second';

        if (left !== 1) {
          text = `Game starting in ${60 - this.timeout} seconds`;
        }

        // Message type is from StarMash, should be like original.
        this.emit(
          BROADCAST_SERVER_MESSAGE,
          text,
          SERVER_MESSAGE_TYPES.ALERT,
          CTF_COUNTDOWN_DURATION_MS
        );
      } else if (
        this.timeout >= 60 ||
        (this.storage.gameEntity.match.blue === 0 && this.storage.gameEntity.match.red === 0)
      ) {
        // TODO: not sure about message type.
        this.emit(
          BROADCAST_SERVER_MESSAGE,
          'Game starting!',
          SERVER_MESSAGE_TYPES.INFO,
          5 * MS_PER_SEC
        );

        this.storage.gameEntity.match.current += 1;
        this.storage.gameEntity.match.isActive = true;
        this.storage.gameEntity.match.start = Date.now();
        this.storage.gameEntity.match.blue = 0;
        this.storage.gameEntity.match.red = 0;
        this.timeout = 0;

        this.emit(BROADCAST_GAME_FLAG, CTF_TEAMS.BLUE);
        this.emit(BROADCAST_GAME_FLAG, CTF_TEAMS.RED);

        this.storage.playerList.forEach(player => {
          player.delayed.RESPAWN = true;
          player.times.activePlayingBlue = 0;
          player.times.activePlayingRed = 0;
          this.emit(PLAYERS_RESPAWN, player.id.current);
        });

        this.emit(TIMELINE_GAME_MATCH_START);
      }
    }
  }

  /**
   * Inform just connected player about the game state.
   *
   * @param playerId
   */
  announceMatchState(playerId: PlayerId): void {
    setTimeout(() => {
      this.emit(BROADCAST_GAME_FLAG, CTF_TEAMS.BLUE, playerId);
      this.emit(BROADCAST_GAME_FLAG, CTF_TEAMS.RED, playerId);
    }, CTF_FLAGS_STATE_TO_NEW_PLAYER_BROADCAST_DELAY_MS);
  }

  /**
   * A team successfully captured the flag. Check for the end of the game.
   *
   * @param winnerTeamId
   */
  onTeamCaptured(winnerTeamId: TeamId): void {
    if (winnerTeamId === CTF_TEAMS.BLUE) {
      this.storage.gameEntity.match.blue += 1;
    } else {
      this.storage.gameEntity.match.red += 1;
    }

    if (this.storage.gameEntity.match.blue >= 3 || this.storage.gameEntity.match.red >= 3) {
      this.emit(CTF_RESET_FLAGS);

      this.storage.gameEntity.match.winnerTeam = winnerTeamId;
      this.storage.gameEntity.match.isActive = false;
      this.storage.gameEntity.match.bounty =
        CTF_WIN_BOUNTY.BASE + CTF_WIN_BOUNTY.INCREMENT * (this.storage.playerList.size - 1);

      if (this.storage.gameEntity.match.bounty > CTF_WIN_BOUNTY.MAX) {
        this.storage.gameEntity.match.bounty = CTF_WIN_BOUNTY.MAX;
      }

      const matchDuration = Date.now() - this.storage.gameEntity.match.start;

      this.storage.playerList.forEach(player => {
        if (player.planestate.flagspeed === true) {
          player.planestate.flagspeed = false;
          this.emit(BROADCAST_PLAYER_UPDATE, player.id.current);
        }

        // measure share in match in steps of 0.1, based on how long this player
        // was active on the winning side of the match during the game.
        const timeActiveOnWinningTeam =
          winnerTeamId === CTF_TEAMS.BLUE
            ? player.times.activePlayingBlue
            : player.times.activePlayingRed;
        const shareInMatch = Math.round((timeActiveOnWinningTeam * 10) / matchDuration) / 10;
        const shareInScore = Math.round(this.storage.gameEntity.match.bounty * shareInMatch);

        if (shareInScore > 0) {
          player.score.current += shareInScore;

          this.emit(RESPONSE_SCORE_UPDATE, player.id.current);
        }
      });

      this.emit(BROADCAST_SERVER_CUSTOM);

      const humanTimeParts = [];
      const seconds = Math.floor((matchDuration / 1000) % 60);
      const minutes = Math.floor((matchDuration / (1000 * 60)) % 60);
      const hours = Math.floor((matchDuration / (1000 * 60 * 60)) % 24);

      if (hours > 0) {
        humanTimeParts.push(`${hours}h`);
      }

      if (minutes > 0) {
        humanTimeParts.push(`${minutes}m`);
      }

      if (seconds > 0) {
        humanTimeParts.push(`${seconds}s`);
      }

      this.emit(BROADCAST_CHAT_SERVER_PUBLIC, `Game time: ${humanTimeParts.join(' ')}.`);
    }
  }
}
