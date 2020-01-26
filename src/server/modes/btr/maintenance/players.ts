/* eslint-disable no-lonely-if */
import { SERVER_MESSAGE_TYPES } from '@airbattle/protocol';
import {
  PLAYERS_ASSIGN_SPAWN_POSITION,
  SPECTATE_ENTER_MODE,
  PLAYERS_CREATED,
  RESPONSE_SERVER_MESSAGE,
  BROADCAST_GAME_FIREWALL,
} from '@/events';
import { PLAYERS_ALIVE_STATUSES, MS_PER_SEC, SHIPS_ENCLOSE_RADIUS } from '@/constants';
import { System } from '@/server/system';
import { getRandomInt } from '@/support/numbers';
import Entity from '@/server/entity';
import { PlayerId } from '@/types';
import { CHANNEL_SPECTATE } from '@/server/channels';

export default class GamePlayers extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [PLAYERS_ASSIGN_SPAWN_POSITION]: this.onAssignPlayerSpawnPosition,
      [PLAYERS_CREATED]: this.onCreatePlayer,
    };
  }

  onAssignPlayerSpawnPosition(player: Entity): void {
    if (this.storage.gameEntity.match.isActive === false) {
      /**
       * Match not started yet, have players wait around Europe
       */
      let x = 0;
      let y = 0;
      let r = 0;

      const spawnZones = this.storage.spawnZoneSet.get(0).get(player.planetype.current);

      [x, y] = spawnZones.get(getRandomInt(0, spawnZones.size - 1));
      r = SHIPS_ENCLOSE_RADIUS[player.planetype.current] / 2;

      player.position.x = x + getRandomInt(-r, r);
      player.position.y = y + getRandomInt(-r, r);
    } else {
      /**
       * Match already started, indicate any new players must spectate; onCreatePlayer makes this happen
       */
      if (!this.helpers.isPlayerConnected(player.id.current)) {
        player.alivestatus.current = PLAYERS_ALIVE_STATUSES.SPECTATE;
      }
    }
  }

  /**
   * Inform just connected player about the game state, and place them in spectate if game in progress
   *
   * @param playerId
   */
  onCreatePlayer(playerId: PlayerId): void {
    const player = this.storage.playerList.get(playerId);
    const connectionId = this.storage.playerMainConnectionList.get(playerId);

    if (player.alivestatus.current === PLAYERS_ALIVE_STATUSES.SPECTATE) {
      this.channel(CHANNEL_SPECTATE).delay(SPECTATE_ENTER_MODE, playerId);
    }

    if (this.storage.gameEntity.match.isActive === true) {
      /**
       * Game in progress
       */
      this.emit(
        RESPONSE_SERVER_MESSAGE,
        connectionId,
        'Game in progress<br>Please wait until a new game starts',
        SERVER_MESSAGE_TYPES.ALERT,
        5 * MS_PER_SEC
      );
      this.emit(BROADCAST_GAME_FIREWALL, playerId);
    }
  }
}