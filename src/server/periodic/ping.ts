import { ServerPackets, SERVER_PACKETS } from '@airbattle/protocol';
import { CONNECTIONS_PACKET_PONG_TIMEOUT_MS } from '../../constants';
import { CONNECTIONS_SEND_PACKETS, RESPONSE_SEND_PING, TIMEOUT_PONG } from '../../events';
import { getRandomInt } from '../../support/numbers';
import { MainConnectionId } from '../../types';
import { System } from '../system';

export default class PingPeriodic extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [RESPONSE_SEND_PING]: this.onSendPing,
    };
  }

  onSendPing(connectionId: MainConnectionId): void {
    if (!this.storage.connectionList.has(connectionId)) {
      return;
    }

    const connection = this.storage.connectionList.get(connectionId);

    if (!this.helpers.isPlayerConnected(connection.playerId)) {
      return;
    }

    const player = this.storage.playerList.get(connection.playerId);

    player.ping.num = getRandomInt(1000, 99999);
    player.ping.clock = this.helpers.clock();

    this.emit(
      CONNECTIONS_SEND_PACKETS,
      {
        c: SERVER_PACKETS.PING,
        clock: player.ping.clock,
        num: player.ping.num,
      } as ServerPackets.Ping,
      connectionId
    );

    connection.timeouts.pong = setTimeout(() => {
      this.emit(TIMEOUT_PONG, connectionId);
    }, CONNECTIONS_PACKET_PONG_TIMEOUT_MS);
  }
}
