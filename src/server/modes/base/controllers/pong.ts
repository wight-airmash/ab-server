import { ClientPackets } from '@airbattle/protocol';
import { CONNECTIONS_PACKET_PING_INTERVAL_MS } from '@/constants';
import {
  CONNECTIONS_KICK,
  PLAYERS_KICK,
  RESPONSE_PING_RESULT,
  RESPONSE_SEND_PING,
  ROUTE_PONG,
} from '@/events';
import { System } from '@/server/system';
import { MainConnectionId } from '@/types';

export default class PongMessageHandler extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [ROUTE_PONG]: this.onMessageReceived,
    };
  }

  /**
   * Handle `Pong` request
   *
   * @param connectionId player connection id
   * @param msg player packet
   */
  onMessageReceived(connectionId: MainConnectionId, msg: ClientPackets.Pong): void {
    if (!this.storage.connectionList.has(connectionId)) {
      return;
    }

    const connection = this.storage.connectionList.get(connectionId);

    /**
     * Only logged in player can send pong request
     */
    if (connection.meta.playerId === null) {
      this.emit(CONNECTIONS_KICK, connectionId);

      return;
    }

    clearTimeout(connection.meta.timeouts.pong);

    if (!this.storage.playerList.has(connection.meta.playerId)) {
      return;
    }

    const player = this.storage.playerList.get(connection.meta.playerId);

    if (msg.num !== player.ping.num) {
      this.log.debug('Pong has invalid num.', { ping: player.ping.num, pong: msg.num });
      this.emit(PLAYERS_KICK, connection.meta.playerId);

      return;
    }

    player.ping.num = null;
    player.ping.current = Math.ceil((this.helpers.clock() - player.ping.clock) / 100);

    this.emit(RESPONSE_PING_RESULT, connectionId);

    if (player.ping.current < CONNECTIONS_PACKET_PING_INTERVAL_MS) {
      connection.meta.periodic.ping = setTimeout(() => {
        this.emit(RESPONSE_SEND_PING, connectionId);
      }, CONNECTIONS_PACKET_PING_INTERVAL_MS);
    } else {
      this.emit(RESPONSE_SEND_PING, connectionId);
    }
  }
}
