import { SERVER_ERRORS, SERVER_PACKETS } from '@airbattle/protocol';
import {
  CONNECTIONS_FLOODING_BAN_MS,
  CONNECTIONS_FLOOD_DETECTS_TO_BAN,
  CONNECTIONS_STATUS,
} from '@/constants';
import {
  CONNECTIONS_BAN_IP,
  CONNECTIONS_BREAK,
  CONNECTIONS_CHECK_PACKET_LIMITS,
  CONNECTIONS_DISCONNECT_PLAYER,
  CONNECTIONS_SEND_PACKET,
  ERRORS_PACKET_FLOODING_DETECTED,
} from '@/events';
import { System } from '@/server/system';
import { ConnectionId, PlayerConnection } from '@/types';

export default class PacketsGuard extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [CONNECTIONS_CHECK_PACKET_LIMITS]: this.onCheckLimits,
      [ERRORS_PACKET_FLOODING_DETECTED]: this.onPacketFlooding,
    };
  }

  onCheckLimits(connection: PlayerConnection): void {
    if (
      (connection.meta.limits.any > this.app.config.packetsLimit.any ||
        connection.meta.limits.key > this.app.config.packetsLimit.key) &&
      connection.meta.status < CONNECTIONS_STATUS.PRECLOSED
    ) {
      this.onPacketFlooding(connection.meta.id);
    }
  }

  onPacketFlooding(connectionId: ConnectionId): void {
    if (!this.storage.connectionList.has(connectionId)) {
      return;
    }

    const connection = this.storage.connectionList.get(connectionId);

    if (connection.meta.status === CONNECTIONS_STATUS.PENDING_TO_CLOSE) {
      return;
    }

    const { playerId } = connection.meta;

    if (playerId !== null) {
      if (this.helpers.isPlayerConnected(playerId)) {
        const secondConnectionId =
          connection.meta.isBackup === true
            ? this.storage.playerMainConnectionList.get(playerId)
            : this.storage.playerBackupConnectionList.get(playerId);
        const secondConnection = this.storage.connectionList.get(secondConnectionId);

        if (secondConnection.meta.status > CONNECTIONS_STATUS.ESTABLISHED) {
          connection.meta.status = CONNECTIONS_STATUS.PENDING_TO_CLOSE;

          setTimeout(() => {
            this.emit(CONNECTIONS_BREAK, connectionId);
          }, 200);

          return;
        }
      }
    }

    let floodCounter = 1;

    connection.meta.status = CONNECTIONS_STATUS.PRECLOSED;

    if (this.storage.packetFloodingList.has(connection.meta.ip)) {
      floodCounter = this.storage.packetFloodingList.get(connection.meta.ip) + 1;
    }

    this.storage.packetFloodingList.set(connection.meta.ip, floodCounter);

    this.log.info('Packet flooding.', {
      ip: connection.meta.ip,
      connection: connection.meta.id,
    });

    if (this.app.config.autoBan === true && floodCounter >= CONNECTIONS_FLOOD_DETECTS_TO_BAN) {
      this.log.info('Packet flooding ban.', {
        ip: connection.meta.ip,
        connection: connection.meta.id,
      });

      this.emit(
        CONNECTIONS_BAN_IP,
        connection.meta.ip,
        CONNECTIONS_FLOODING_BAN_MS,
        ERRORS_PACKET_FLOODING_DETECTED
      );

      this.emit(
        CONNECTIONS_SEND_PACKET,
        {
          c: SERVER_PACKETS.ERROR,
          error: SERVER_ERRORS.PACKET_FLOODING_BAN,
        },
        connectionId
      );

      this.storage.packetFloodingList.delete(connection.meta.ip);
    } else {
      this.log.debug(
        `Disconnect flooding IP ${connection.meta.ip}, connection id${connection.meta.id}.`
      );

      this.emit(
        CONNECTIONS_SEND_PACKET,
        {
          c: SERVER_PACKETS.ERROR,
          error: SERVER_ERRORS.PACKET_FLOODING_DISCONNECT,
        },
        connectionId
      );
    }

    if (playerId !== null) {
      setTimeout(() => {
        this.emit(CONNECTIONS_DISCONNECT_PLAYER, playerId);
      }, 100);
    } else {
      setTimeout(() => {
        this.emit(CONNECTIONS_BREAK, connectionId);
      }, 100);
    }
  }
}
