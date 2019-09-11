import { ClientPackets, KEY_CODES, KEY_NAMES } from '@airbattle/protocol';
import { PLAYERS_ALIVE_STATUSES, SHIPS_TYPES, LIMITS_KEY_WEIGHT } from '@/constants';
import { CONNECTIONS_KICK, ROUTE_KEY } from '@/events';
import { System } from '@/server/system';
import { ConnectionId } from '@/types';

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

    connection.meta.limits.key += LIMITS_KEY_WEIGHT;

    if (connection.meta.playerId === null) {
      this.log.info('Incorrect message order. Connection refused.', {
        connection: connectionId,
      });
      this.emit(CONNECTIONS_KICK, connectionId);

      return;
    }

    /**
     * Check if player has already logged in.
     * We don't need to handle any packets before getting `Login`.
     */
    if (!this.storage.playerList.has(connection.meta.playerId)) {
      return;
    }

    const player = this.storage.playerList.get(connection.meta.playerId);

    /**
     * 1. Check the sequence to not to handle outdated packets.
     * 2. Don't need to handle movement keys for dead/spectating players.
     */
    if (
      player.keystate.seq < msg.seq &&
      this.validKeyCodes.has(msg.key) &&
      player.alivestatus.current === PLAYERS_ALIVE_STATUSES.ALIVE
    ) {
      player.keystate[KEY_NAMES[msg.key]] = msg.state;
      player.keystate.seq = msg.seq;

      if (
        msg.key !== KEY_CODES.SPECIAL ||
        (msg.key === KEY_CODES.SPECIAL && player.planetype.current === SHIPS_TYPES.COPTER)
      ) {
        player.delayed.BROADCAST_PLAYER_UPDATE = true;
      }
    }
  }
}
