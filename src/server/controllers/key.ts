import { ClientPackets, KEY_CODES, KEY_NAMES } from '@airbattle/protocol';
import { LIMITS_KEY_WEIGHT, PLAYERS_ALIVE_STATUSES, SHIPS_TYPES } from '../../constants';
import { CONNECTIONS_KICK, ROUTE_KEY } from '../../events';
import { ConnectionId } from '../../types';
import { System } from '../system';

export default class KeyMessageHandler extends System {
  private validKeyCodes: Set<number>;

  constructor({ app }) {
    super({ app });

    this.validKeyCodes = new Set(
      Object.keys(KEY_CODES).map(key => {
        return KEY_CODES[key];
      })
    );

    this.listeners = {
      [ROUTE_KEY]: this.onMessageReceived,
    };
  }

  /**
   * Handle `Key` request.
   * Requests come from both the primary and backup connections.
   *
   * @param connectionId player connection id
   * @param msg player packet
   */
  onMessageReceived(connectionId: ConnectionId, msg: ClientPackets.Key): void {
    if (!this.storage.connectionList.has(connectionId)) {
      return;
    }

    const connection = this.storage.connectionList.get(connectionId);

    if (!connection.lagging.isActive) {
      connection.limits.key += LIMITS_KEY_WEIGHT;
    }

    if (connection.playerId === null) {
      this.log.info('Incorrect message order. Connection refused: %o', {
        connection: connectionId,
      });

      this.emit(CONNECTIONS_KICK, connectionId);

      return;
    }

    /**
     * Check if player has already logged in.
     * We don't need to handle any packets before getting `Login`.
     */
    if (!this.storage.playerList.has(connection.playerId)) {
      return;
    }

    const player = this.storage.playerList.get(connection.playerId);

    /**
     * 1. Check the sequence to not to handle outdated packets.
     * 2. Don't need to handle movement keys for dead/spectating players.
     */
    if (
      player.keystate.seq < msg.seq &&
      player.alivestatus.current === PLAYERS_ALIVE_STATUSES.ALIVE &&
      this.validKeyCodes.has(msg.key)
    ) {
      player.keystate[KEY_NAMES[msg.key]] = msg.state;
      player.keystate.seq = msg.seq;

      if (msg.state) {
        player.keystate.presses.total += 1;
        player.keystate.presses[KEY_NAMES[msg.key]] += 1;
      }

      if (
        msg.key !== KEY_CODES.SPECIAL ||
        (msg.key === KEY_CODES.SPECIAL && player.planetype.current === SHIPS_TYPES.COPTER)
      ) {
        player.delayed.BROADCAST_PLAYER_UPDATE = true;
      }
    }
  }
}
