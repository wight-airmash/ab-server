import { SERVER_ERRORS, SERVER_PACKETS } from '@airbattle/protocol';
import {
  CONNECTIONS_FLOODING_BAN_MS,
  CONNECTIONS_FLOOD_DETECTS_TO_BAN,
  LIMITS_ANY,
  LIMITS_KEY,
  CONNECTIONS_STATUS,
} from '@/constants';
import {
  CONNECTIONS_BAN_IP,
  CONNECTIONS_DISCONNECT_PLAYER,
  ERRORS_PACKET_FLOODING_DETECTED,
  CONNECTIONS_SEND_PACKET,
  CONNECTIONS_BREAK,
  CONNECTIONS_CHECK_PACKET_LIMITS,
} from '@/events';
import { System } from '@/server/system';
import { ConnectionId, PlayerConnection } from '@/types';

export default class PacketsGuard extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [ERRORS_PACKET_FLOODING_DETECTED]: this.onPacketFlooding,
      [CONNECTIONS_CHECK_PACKET_LIMITS]: this.onCheckLimits,
    };
  }

  onCheckLimits(connection: PlayerConnection): void {
    if (
      (connection.meta.limits.any > LIMITS_ANY || connection.meta.limits.key > LIMITS_KEY) &&
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

    if (connection.meta.playerId !== null) {
      if (this.helpers.isPlayerConnected(connection.meta.playerId)) {
        const secondConnectionId =
          connection.meta.isBackup === true
            ? this.storage.playerBackupConnectionList.get(connection.meta.playerId)
            : this.storage.playerMainConnectionList.get(connection.meta.playerId);
        const secondConnection = this.storage.connectionList.get(secondConnectionId);

        if (secondConnection.meta.status > CONNECTIONS_STATUS.OPENED) {
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

    if (floodCounter >= CONNECTIONS_FLOOD_DETECTS_TO_BAN) {
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

    if (connection.meta.playerId !== null) {
      setTimeout(() => {
        this.emit(CONNECTIONS_DISCONNECT_PLAYER, connectionId);
      }, 100);
    } else {
      setTimeout(() => {
        this.emit(CONNECTIONS_BREAK, connectionId);
      }, 100);
    }
  }
}
