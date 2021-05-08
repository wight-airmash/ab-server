import { BTR_FIREWALL_STATUS, SERVER_MESSAGE_TYPES } from '@airbattle/protocol';
import {
  BTR_FIREWALL_INITIAL_RADIUS,
  BTR_FIREWALL_POSITION,
  BTR_SHIPS_TYPES_ORDER,
  MS_PER_SEC,
  PLAYERS_ALIVE_STATUSES,
  PLAYERS_HEALTH,
  SHIPS_NAMES,
} from '../../../constants';
import {
  BROADCAST_GAME_FIREWALL,
  BROADCAST_PLAYERS_ALIVE,
  BROADCAST_PLAYER_HIT,
  BROADCAST_SERVER_CUSTOM,
  BROADCAST_SERVER_MESSAGE,
  PLAYERS_ALIVE_UPDATE,
  PLAYERS_HIT,
  PLAYERS_KILL,
  PLAYERS_RESPAWN,
  RESPONSE_SCORE_UPDATE,
  SYNC_ENQUEUE_UPDATE,
  TIMELINE_CLOCK_HALFSECOND,
  TIMELINE_CLOCK_SECOND,
  TIMELINE_GAME_MATCH_END,
  TIMELINE_GAME_MATCH_START,
} from '../../../events';
import { SCOREBOARD_FORCE_UPDATE } from '../../../events/scoreboard';
import Entity from '../../../server/entity';
import { System } from '../../../server/system';
import { getRandomNumber } from '../../../support/numbers';
import { has } from '../../../support/objects';
import { Player, PlayerId } from '../../../types';

export default class GameMatches extends System {
  private matchStartTimeout = 0;

  private firewallUpdateTimeout = 0;

  protected players: Map<PlayerId, Entity>;

  constructor({ app }) {
    super({ app });

    this.players = this.storage.playerList;

    this.listeners = {
      [PLAYERS_ALIVE_UPDATE]: this.updatePlayersAlive,
      [TIMELINE_CLOCK_HALFSECOND]: this.updateFirewallRadius,
      [TIMELINE_CLOCK_SECOND]: this.onSecondTick,
    };
  }

  updateFirewallRadius(): void {
    const { match } = this.storage.gameEntity;

    if (match.isActive) {
      match.firewall.radius =
        BTR_FIREWALL_INITIAL_RADIUS + (match.firewall.speed * (Date.now() - match.start)) / 1000;

      const playersIterator = this.storage.playerList.values();
      let player: Player = playersIterator.next().value;

      while (player !== undefined) {
        if (player.alivestatus.current === PLAYERS_ALIVE_STATUSES.ALIVE) {
          const distance = Math.hypot(
            match.firewall.posX - player.position.x,
            match.firewall.posY - player.position.y
          );

          if (distance > match.firewall.radius) {
            const firewallId = 0;
            const firewallDamage = 0.25;

            this.emit(PLAYERS_HIT, player.id.current, firewallId, firewallDamage);
            this.delay(BROADCAST_PLAYER_HIT, firewallId, [player.id.current]);

            if (player.health.current === PLAYERS_HEALTH.MIN) {
              this.emit(PLAYERS_KILL, player.id.current, firewallId);

              if (!player.delayed.RESPONSE_SCORE_UPDATE) {
                player.delayed.RESPONSE_SCORE_UPDATE = true;
                this.delay(RESPONSE_SCORE_UPDATE, player.id.current);
              }
            }
          }
        }

        player = playersIterator.next().value;
      }
    }
  }

  broadcastServerMessageAlert(message: string, displayTime: number): void {
    this.emit(
      BROADCAST_SERVER_MESSAGE,
      message,
      SERVER_MESSAGE_TYPES.ALERT,
      displayTime * MS_PER_SEC
    );
  }

  startMatch(): void {
    this.storage.gameEntity.match.isActive = true;

    this.storage.gameEntity.match.firewall = {
      status: BTR_FIREWALL_STATUS.ACTIVE,
      radius: BTR_FIREWALL_INITIAL_RADIUS,
      posX: getRandomNumber(BTR_FIREWALL_POSITION.MIN_X, BTR_FIREWALL_POSITION.MAX_X),
      posY: getRandomNumber(BTR_FIREWALL_POSITION.MIN_Y, BTR_FIREWALL_POSITION.MAX_Y),
      speed: -this.config.btr.firewallSpeed,
    };

    const { match } = this.storage.gameEntity;

    const playersIterator = this.storage.playerList.values();
    let player: Player = playersIterator.next().value;

    while (player !== undefined) {
      player.delayed.RESPAWN = true;
      this.emit(PLAYERS_RESPAWN, player.id.current, match.shipType);

      player = playersIterator.next().value;
    }

    match.bounty = Math.min(this.storage.playerList.size * 500, 5000);

    this.storage.gameEntity.match.start = Date.now();

    this.emit(PLAYERS_ALIVE_UPDATE);

    this.emit(TIMELINE_GAME_MATCH_START);

    this.emit(SCOREBOARD_FORCE_UPDATE);
  }

  prepareNewMatch(): void {
    /**
     * Determine next ship type
     */

    const { match } = this.storage.gameEntity;

    let index = BTR_SHIPS_TYPES_ORDER.indexOf(match.shipType);

    index += 1;

    if (index >= BTR_SHIPS_TYPES_ORDER.length) {
      index = 0;
    }

    const shipType = BTR_SHIPS_TYPES_ORDER[index];

    match.shipType = shipType;

    /**
     * Respawn all players around Europe, and reset match kill count
     */
    const playersIterator = this.storage.playerList.values();
    let player: Player = playersIterator.next().value;

    while (player !== undefined) {
      player.delayed.RESPAWN = true;
      player.kills.currentmatch = 0;

      this.emit(PLAYERS_RESPAWN, player.id.current, shipType);

      player = playersIterator.next().value;
    }

    this.emit(SCOREBOARD_FORCE_UPDATE);
  }

  onSecondTick(): void {
    if (this.storage.gameEntity.match.isActive) {
      /**
       * Game in progress
       */
      this.firewallUpdateTimeout += 1;

      if (this.firewallUpdateTimeout === 5) {
        this.emit(BROADCAST_GAME_FIREWALL);
        this.firewallUpdateTimeout = 0;
      }
    } else {
      /**
       * Waiting for next match to start.
       */
      this.matchStartTimeout += 1;

      if (this.matchStartTimeout === 0) {
        /**
         * After the 5 second post-match interlude, a new match is prepared.
         */
        this.prepareNewMatch();
      } else if (this.matchStartTimeout >= 0) {
        /**
         * Waiting period between matches.
         */
        if (this.storage.playerList.size >= 2) {
          /**
           * Match can only be started if two or more players are still present.
           */
          const messagePrefix = `${SHIPS_NAMES[this.storage.gameEntity.match.shipType]} round starting`;
          const { matchWaitTime } = this.config.btr;

          if (this.matchStartTimeout >= matchWaitTime) {
            /**
             * Start match if wait time reached.
             */
            this.startMatch();
            this.broadcastServerMessageAlert(`${messagePrefix}!`, 3);
          } else {
            /**
             * Alert players of countdown to next match.
             */
            const matchWaitTimeLeft = matchWaitTime - this.matchStartTimeout;

            switch (matchWaitTimeLeft) {
              case 1:
                this.broadcastServerMessageAlert(`${messagePrefix} in a second`, 2);
                break;
              case 2:
              case 3:
              case 4:
              case 5:
                this.broadcastServerMessageAlert(`${messagePrefix} in ${matchWaitTimeLeft} seconds`, 2);
                break;
              case 10:
                this.broadcastServerMessageAlert(`${messagePrefix} in ${matchWaitTimeLeft} seconds`, 3);
                break;
              case 30:
                this.broadcastServerMessageAlert(`${messagePrefix} in ${matchWaitTimeLeft} seconds`, 7);
                break;
              case 60:
                this.broadcastServerMessageAlert(`${messagePrefix} in 1 minute`, 12);
                break;
              default:
                break;
            }
          }
        } else {
          /**
           * Reset match start time counter if no players or just one player is present.
           */
          this.matchStartTimeout = 1;
        }
      }
    }
  }

  updatePlayersAlive(): void {
    const { match } = this.storage.gameEntity;

    if (match.isActive) {
      /**
       * Count number of alive players
       */
      let playersAlive = 0;
      /**
       * Potential winner. If there's only one survivor, it's definitely a winner.
       */
      let winner: Player;

      const playersIterator = this.storage.playerList.values();
      let player: Player = playersIterator.next().value;

      while (player !== undefined) {
        if (player.alivestatus.current === PLAYERS_ALIVE_STATUSES.ALIVE) {
          playersAlive += 1;
          winner = player;
        }

        player = playersIterator.next().value;
      }

      match.playersAlive = playersAlive;

      /**
       * Check is potential winner a real winner.
       */
      if (playersAlive === 1) {
        /**
         * Celebrate the BTR winner
         */
        match.winnerName = winner.name.current;
        match.winnerFlag = winner.flag.code;
        match.winnerKills = winner.kills.currentmatch;

        this.emit(BROADCAST_SERVER_CUSTOM);

        /**
         * Award bounty
         */
        winner.score.current += match.bounty;
        winner.wins.current += 1;

        if (has(winner, 'user')) {
          const user = this.storage.users.list.get(winner.user.id);

          user.lifetimestats.earnings += match.bounty;
          this.storage.users.hasChanges = true;

          if (this.config.sync.enabled) {
            const eventDetail = {
              match: { start: match.start },
              player: {
                kills: winner.kills.currentmatch,
                plane: winner.planetype.current,
                team: winner.team.current,
                flag: winner.flag.current,
              },
            };

            this.emit(
              SYNC_ENQUEUE_UPDATE,
              'user',
              winner.user.id,
              { earnings: match.bounty },
              Date.now(),
              ['btr-match-winner', eventDetail]
            );
          }
        }

        this.emit(RESPONSE_SCORE_UPDATE, winner.id.current);
      }

      /**
       * Notify all players of updated player alive count
       */
      this.emit(BROADCAST_PLAYERS_ALIVE);

      if (playersAlive <= 1) {
        /**
         * Remove firewall
         */
        match.firewall.status = BTR_FIREWALL_STATUS.INACTIVE;
        this.emit(BROADCAST_GAME_FIREWALL);

        /**
         * End match, with a short wait before restarting countdown
         */
        match.isActive = false;
        this.matchStartTimeout = -5;
        this.broadcastServerMessageAlert('Game ended!', 5);

        this.emit(TIMELINE_GAME_MATCH_END);
      }
    }
  }
}
