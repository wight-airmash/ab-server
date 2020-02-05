import { BTR_FIREWALL_STATUS, SERVER_MESSAGE_TYPES } from '@airbattle/protocol';
import {
  BTR_FIREWALL_INITIAL_RADIUS,
  BTR_FIREWALL_POSITION,
  BTR_FIREWALL_SPEED,
  BTR_SHIPS_TYPES_ORDER,
  MS_PER_SEC,
  PLAYERS_ALIVE_STATUSES,
  PLAYERS_HEALTH,
  SHIPS_NAMES,
} from '@/constants';
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
  TIMELINE_CLOCK_HALFSECOND,
  TIMELINE_CLOCK_SECOND,
  TIMELINE_GAME_MATCH_START,
  TIMELINE_GAME_MATCH_END,
} from '@/events';
import Entity from '@/server/entity';
import { System } from '@/server/system';
import { getRandomNumber } from '@/support/numbers';
import { has } from '@/support/objects';
import { PlayerId } from '@/types';

export default class GameMatches extends System {
  private gameStartTimeout = 0;

  private firewallUpdateTimeout = 0;

  protected players: Map<PlayerId, Entity>;

  constructor({ app }) {
    super({ app });

    this.players = this.storage.playerList;

    this.listeners = {
      [TIMELINE_CLOCK_HALFSECOND]: this.updateFirewallRadius,
      [TIMELINE_CLOCK_SECOND]: this.onSecondTick,
      [PLAYERS_ALIVE_UPDATE]: this.updatePlayersAlive,
    };
  }

  updateFirewallRadius(): void {
    const { match } = this.storage.gameEntity;

    if (match.isActive === true) {
      match.firewall.radius =
        BTR_FIREWALL_INITIAL_RADIUS + (match.firewall.speed * (Date.now() - match.start)) / 1000;
      this.log.debug('Updated firewall radius', match.firewall);

      this.players.forEach(player => {
        if (player.alivestatus.current === PLAYERS_ALIVE_STATUSES.ALIVE) {
          const distance = Math.hypot(
            match.firewall.posX - player.position.x,
            match.firewall.posY - player.position.y
          );

          if (distance > match.firewall.radius) {
            this.log.debug(`Firewall hit player id${player.id}`, player.position);

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
      });
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
      speed: BTR_FIREWALL_SPEED,
    };

    const { match } = this.storage.gameEntity;

    this.storage.playerList.forEach(player => {
      player.delayed.RESPAWN = true;
      this.emit(PLAYERS_RESPAWN, player.id.current, match.shipType);
    });

    match.bounty = Math.min(this.storage.playerList.size * 500, 5000);

    this.emit(TIMELINE_GAME_MATCH_START);

    this.emit(PLAYERS_ALIVE_UPDATE);

    this.storage.gameEntity.match.start = Date.now();
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
    this.storage.playerList.forEach(player => {
      player.delayed.RESPAWN = true;
      player.kills.currentmatch = 0;

      this.emit(PLAYERS_RESPAWN, player.id.current, shipType);
    });
  }

  onSecondTick(): void {
    if (this.storage.gameEntity.match.isActive === false) {
      /**
       * Waiting for game to start
       */
      this.gameStartTimeout += 1;

      if (this.gameStartTimeout === 0) {
        /**
         * After five second waiting period, new match is prepared regardless of number of players present
         */
        this.prepareNewMatch();
      }

      if (this.gameStartTimeout >= 0 && this.storage.playerList.size < 2) {
        /**
         * Matches started from joining a single waiting player start more quickly (within ~5 seconds)
         */
        this.gameStartTimeout = 63;
      } else if (this.storage.playerList.size >= 2) {
        /**
         * Post-match countdown to next match if two or more players are still present
         */
        if (this.gameStartTimeout === 10) {
          const shipName = SHIPS_NAMES[this.storage.gameEntity.match.shipType];

          this.broadcastServerMessageAlert(`${shipName} round starting in 1 minute`, 12);
        } else if (this.gameStartTimeout === 40) {
          this.broadcastServerMessageAlert('Game starting in 30 seconds', 7);
        } else if (this.gameStartTimeout === 60) {
          this.broadcastServerMessageAlert('Game starting in 10 seconds', 7);
        } else if (this.gameStartTimeout >= 65 && this.gameStartTimeout < 70) {
          const left = 60 - this.gameStartTimeout;
          let text = 'Game starting in a second';

          if (left !== 1) {
            text = `Game starting in ${70 - this.gameStartTimeout} seconds`;
          }

          this.broadcastServerMessageAlert(text, 2);
        } else if (this.gameStartTimeout >= 70) {
          this.startMatch();

          this.broadcastServerMessageAlert('Game starting!', 3);

          this.gameStartTimeout = 0;
        }
      }
    } else {
      /**
       * Game in progress
       */
      this.firewallUpdateTimeout += 1;

      if (this.firewallUpdateTimeout === 5) {
        this.emit(BROADCAST_GAME_FIREWALL);
        this.firewallUpdateTimeout = 0;
      }
    }
  }

  updatePlayersAlive(): void {
    const { match } = this.storage.gameEntity;

    if (match.isActive === true) {
      /**
       * Count number of alive players
       */
      let playersAlive = 0;
      /**
       * Potential winner. If there's only one survivor, it's definitely a winner.
       */
      let winner: Entity;

      this.storage.playerList.forEach(player => {
        if (player.alivestatus.current === PLAYERS_ALIVE_STATUSES.ALIVE) {
          playersAlive += 1;
          winner = player;
        }
      });

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
          const user = this.storage.userList.get(winner.user.id);

          user.lifetimestats.earnings += match.bounty;
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
        this.gameStartTimeout = -5;
        this.broadcastServerMessageAlert('Game ended!', 5);

        this.emit(TIMELINE_GAME_MATCH_END);
      }
    }
  }
}
