import { SERVER_MESSAGE_TYPES, BTR_FIREWALL_STATUS } from '@airbattle/protocol';
import {
  MS_PER_SEC,
  BTR_FIREWALL_INITIAL_RADIUS,
  BTR_FIREWALL_POSITION,
  BTR_FIREWALL_SPEED,
  PLAYERS_ALIVE_STATUSES,
  PLAYERS_HEALTH,
} from '@/constants';
import {
  BROADCAST_GAME_FIREWALL,
  BROADCAST_SERVER_MESSAGE,
  TIMELINE_CLOCK_SECOND,
  TIMELINE_CLOCK_HALFSECOND,
  PLAYERS_HIT,
  BROADCAST_PLAYER_HIT,
  PLAYERS_KILL,
  RESPONSE_SCORE_UPDATE,
  TIMELINE_GAME_MATCH_START,
} from '@/events';
import { System } from '@/server/system';
import { PlayerId } from '@/types';
import { getRandomNumber } from '@/support/numbers';
import Entity from '@/server/entity';

export default class GameMatches extends System {
  private firewallUpdateTimeout = 0;

  protected players: Map<PlayerId, Entity>;

  constructor({ app }) {
    super({ app });

    this.players = this.storage.playerList;

    this.listeners = {
      [TIMELINE_CLOCK_HALFSECOND]: this.updateFirewallRadius,
      [TIMELINE_CLOCK_SECOND]: this.onSecondTick,
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

  onSecondTick(): void {
    if (this.storage.gameEntity.match.isActive === false) {
      /**
       * Waiting for enough players for game to start
       */
      if (this.storage.playerList.size >= 2) {
        this.storage.gameEntity.match.isActive = true;

        this.storage.gameEntity.match.firewall = {
          status: BTR_FIREWALL_STATUS.ACTIVE,
          radius: BTR_FIREWALL_INITIAL_RADIUS,
          posX: getRandomNumber(BTR_FIREWALL_POSITION.MIN_X, BTR_FIREWALL_POSITION.MAX_X),
          posY: getRandomNumber(BTR_FIREWALL_POSITION.MIN_Y, BTR_FIREWALL_POSITION.MAX_Y),
          speed: BTR_FIREWALL_SPEED,
        };

        this.emit(TIMELINE_GAME_MATCH_START);

        this.storage.gameEntity.match.start = Date.now();

        this.emit(
          BROADCAST_SERVER_MESSAGE,
          'Game starting!',
          SERVER_MESSAGE_TYPES.ALERT,
          3 * MS_PER_SEC
        );
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
}
