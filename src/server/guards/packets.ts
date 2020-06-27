import { SERVER_ERRORS, SERVER_PACKETS } from '@airbattle/protocol';
import {
  CONNECTIONS_FLOODING_BAN_MS,
  CONNECTIONS_FLOOD_DETECTS_TO_BAN,
  CONNECTIONS_STATUS,
} from '../../constants';
import {
  CONNECTIONS_BAN_IP,
  CONNECTIONS_CHECK_PACKET_LIMITS,
  CONNECTIONS_DISCONNECT,
  CONNECTIONS_DISCONNECT_PLAYER,
  CONNECTIONS_SEND_PACKETS,
  ERRORS_PACKET_FLOODING_DETECTED,
} from '../../events';
import { ConnectionId, PlayerConnection } from '../../types';
import { System } from '../system';

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
      (connection.limits.any > this.config.connections.packetLimits.any ||
        connection.limits.key > this.config.connections.packetLimits.key) &&
      connection.status < CONNECTIONS_STATUS.PRECLOSED
    ) {
      this.onPacketFlooding(connection.id);
    }
  }

  onPacketFlooding(connectionId: ConnectionId): void {
    const connection = this.storage.connectionList.get(connectionId);

    if (
      !this.storage.connectionList.has(connectionId) ||
      connection.status === CONNECTIONS_STATUS.PENDING_TO_CLOSE
    ) {
      return;
    }

    const { playerId } = connection;

    if (playerId !== null) {
      if (this.helpers.isPlayerConnected(playerId)) {
        const secondConnectionId = connection.isBackup
          ? this.storage.playerMainConnectionList.get(playerId)
          : this.storage.playerBackupConnectionList.get(playerId);
        const secondConnection = this.storage.connectionList.get(secondConnectionId);

        if (secondConnection.status > CONNECTIONS_STATUS.ESTABLISHED) {
          connection.status = CONNECTIONS_STATUS.PENDING_TO_CLOSE;

          setTimeout(() => {
            this.emit(CONNECTIONS_DISCONNECT, connectionId);
          }, 200);

          return;
        }
      }
    }

    let floodCounter = 1;

    connection.status = CONNECTIONS_STATUS.PRECLOSED;

    if (this.storage.packetFloodingList.has(connection.ip)) {
      floodCounter = this.storage.packetFloodingList.get(connection.ip) + 1;
    }

    this.storage.packetFloodingList.set(connection.ip, floodCounter);

    this.log.info('Packets flooding detected: %o', {
      ip: connection.ip,
      floodCounter,
      playerId,
      connectionId: connection.id,
    });

    if (this.config.connections.autoBan && floodCounter >= CONNECTIONS_FLOOD_DETECTS_TO_BAN) {
      this.log.info('Ban player for the packets flooding: %o', {
        ip: connection.ip,
        playerId,
        connectionId: connection.id,
      });

      this.emit(
        CONNECTIONS_BAN_IP,
        connection.ip,
        CONNECTIONS_FLOODING_BAN_MS,
        ERRORS_PACKET_FLOODING_DETECTED
      );

      this.emit(
        CONNECTIONS_SEND_PACKETS,
        {
          c: SERVER_PACKETS.ERROR,
          error: SERVER_ERRORS.PACKET_FLOODING_BAN,
        },
        connectionId
      );

      this.storage.packetFloodingList.delete(connection.ip);
    } else {
      this.log.info('Disconnect player for the packets flooding: %o', {
        ip: connection.ip,
        playerId,
        connectionId: connection.id,
      });

      this.emit(
        CONNECTIONS_SEND_PACKETS,
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
        this.emit(CONNECTIONS_DISCONNECT, connectionId);
      }, 100);
    }
  }
}
