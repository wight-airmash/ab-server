import { SERVER_MESSAGE_TYPES } from '@airbattle/protocol';
import { MS_PER_SEC, PLAYERS_ALIVE_STATUSES, SHIPS_ENCLOSE_RADIUS } from '../../../constants';
import {
  BROADCAST_GAME_FIREWALL,
  BROADCAST_PLAYERS_ALIVE,
  BROADCAST_SERVER_MESSAGE,
  PLAYERS_ALIVE_UPDATE,
  PLAYERS_ASSIGN_ALIVE_STATUS,
  PLAYERS_ASSIGN_SPAWN_POSITION,
  PLAYERS_CREATED,
  PLAYERS_REMOVED,
  RESPONSE_SERVER_MESSAGE,
  SPECTATE_ENTER_MODE,
} from '../../../events';
import { CHANNEL_SPECTATE } from '../../../events/channels';
import { System } from '../../../server/system';
import { getRandomInt } from '../../../support/numbers';
import { Player, PlayerId } from '../../../types';

export default class GamePlayers extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [PLAYERS_ASSIGN_ALIVE_STATUS]: this.onAssignPlayerAliveStatus,
      [PLAYERS_ASSIGN_SPAWN_POSITION]: this.onAssignPlayerSpawnPosition,
      [PLAYERS_CREATED]: this.onCreatePlayer,
      [PLAYERS_REMOVED]: this.onRemovePlayer,
    };
  }

  onAssignPlayerAliveStatus(player: Player): void {
    if (this.storage.gameEntity.match.isActive) {
      player.alivestatus.current = PLAYERS_ALIVE_STATUSES.SPECTATE;
    }
  }

  onAssignPlayerSpawnPosition(player: Player): void {
    /**
     * Match not started yet, have players wait around Europe
     */
    let x = 0;
    let y = 0;
    let r = 0;

    /**
     * BTR has two spawn zones. The zone at index 0 is a waiting mode zone,
     * at index 1 is the active game mode zone.
     */
    const zoneSetIndex = this.storage.gameEntity.match.isActive ? 1 : 0;
    const spawnZones = this.storage.spawnZoneSet.get(zoneSetIndex).get(player.planetype.current);

    [x, y] = spawnZones.get(getRandomInt(0, spawnZones.size - 1));
    r = SHIPS_ENCLOSE_RADIUS[player.planetype.current] / 2;

    player.position.x = x + getRandomInt(-r, r);
    player.position.y = y + getRandomInt(-r, r);
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

    if (!this.storage.gameEntity.match.isActive) {
      /**
       * Waiting for game to start
       */
      if (this.storage.playerList.size >= 2) {
        this.emit(
          RESPONSE_SERVER_MESSAGE,
          connectionId,
          'New game starting soon',
          SERVER_MESSAGE_TYPES.ALERT,
          5 * MS_PER_SEC
        );
      } else {
        this.emit(
          RESPONSE_SERVER_MESSAGE,
          connectionId,
          'Game will start when 2 or more players are present',
          SERVER_MESSAGE_TYPES.ALERT,
          60 * MS_PER_SEC
        );
      }

      this.delay(PLAYERS_ALIVE_UPDATE);
    } else {
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
      this.emit(BROADCAST_PLAYERS_ALIVE, playerId);
    }
  }

  onRemovePlayer(): void {
    if (this.storage.playerList.size === 1) {
      this.emit(
        BROADCAST_SERVER_MESSAGE,
        'Not enough players',
        SERVER_MESSAGE_TYPES.ALERT,
        5 * MS_PER_SEC
      );
    }

    this.delay(PLAYERS_ALIVE_UPDATE);
  }
}
