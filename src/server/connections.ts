import { marshalServerMessage, unmarshalClientMessage } from '@airbattle/protocol';
import { ProtocolPacket } from '@airbattle/protocol/dist/packets';
import { LIMITS_ANY_WEIGHT, SERVER_MIN_MOB_ID } from '@/constants';
import {
  CONNECTIONS_BREAK,
  CONNECTIONS_CHECK_PACKET_LIMITS,
  CONNECTIONS_CLOSED,
  CONNECTIONS_DISCONNECT_PLAYER,
  CONNECTIONS_KICK,
  CONNECTIONS_PACKET_RECEIVED,
  CONNECTIONS_SEND_PACKET,
  ERRORS_PACKET_DECODE_FAILED,
  PLAYERS_REMOVE,
  ROUTE_PACKET,
} from '@/events';
import { CHANNEL_DISCONNECT_PLAYER } from '@/server/channels';
import { System } from '@/server/system';
import { ConnectionId } from '@/types';

export default class Connections extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [CONNECTIONS_PACKET_RECEIVED]: this.onPacketReceived,
      [CONNECTIONS_SEND_PACKET]: this.onSendPacket,
      [ERRORS_PACKET_DECODE_FAILED]: this.onPacketDecodeFailed,
      [CONNECTIONS_CLOSED]: this.onConnectionClosed,
      [CONNECTIONS_DISCONNECT_PLAYER]: this.onDisconnectPlayer,
      [CONNECTIONS_BREAK]: this.onBreakConnection,
    };
  }

  onPacketReceived(msg: ArrayBuffer, connectionId: ConnectionId): void {
    if (this.app.metrics.collect === true) {
      this.app.metrics.sample.ppsIn += 1;
    }

    const connection = this.storage.connectionList.get(connectionId);

    connection.meta.lastMessageMs = Date.now();
    connection.meta.limits.any += LIMITS_ANY_WEIGHT;

    if (connection.meta.isBot === false) {
      this.emit(CONNECTIONS_CHECK_PACKET_LIMITS, connection);
    }

    try {
      const decodedMsg = unmarshalClientMessage(msg);

      this.emit(ROUTE_PACKET, decodedMsg, connectionId);
    } catch (err) {
      this.log.warn('Message decoding failed.', err.stack);

      this.emit(ERRORS_PACKET_DECODE_FAILED, connectionId);
    }
  }

  onPacketDecodeFailed(connectionId: ConnectionId): void {
    this.emit(CONNECTIONS_KICK, connectionId);
  }

  /**
   * One of the connections (main or backup) was closed.
   *
   * @param connectionId
   */
  onConnectionClosed(connectionId: ConnectionId): void {
    const connection = this.storage.connectionList.get(connectionId);

    this.channel(CHANNEL_DISCONNECT_PLAYER).delay(PLAYERS_REMOVE, connection.meta.playerId);

    /**
     * Stop timers.
     */
    Object.keys(connection.meta.timeouts).forEach(timeout => {
      clearTimeout(connection.meta.timeouts[timeout]);
    });

    Object.keys(connection.meta.periodic).forEach(periodic => {
      clearTimeout(connection.meta.periodic[periodic]);
    });

    /**
     * Remove all connection data.
     */
    this.storage.connectionList.delete(connectionId);

    if (connection.meta.isMain === true) {
      this.storage.mainConnectionIdList.delete(connectionId);
      this.storage.humanConnectionIdList.delete(connectionId);
      this.storage.botConnectionIdList.delete(connectionId);
      this.storage.playerMainConnectionList.delete(connection.meta.playerId);

      if (this.storage.connectionByIPList.has(connection.meta.ip)) {
        const ipConnections = this.storage.connectionByIPList.get(connection.meta.ip);

        ipConnections.delete(connectionId);

        if (ipConnections.size === 0) {
          this.storage.connectionByIPList.delete(connection.meta.ip);
        }
      }

      if (
        connection.meta.teamId !== null &&
        this.storage.connectionIdByTeam.has(connection.meta.teamId)
      ) {
        const teamConnections = this.storage.connectionIdByTeam.get(connection.meta.teamId);

        teamConnections.delete(connectionId);

        if (teamConnections.size === 0 && connection.meta.teamId >= SERVER_MIN_MOB_ID) {
          this.storage.connectionIdByTeam.delete(connection.meta.teamId);
        }

        this.log.debug(`Team id${connection.meta.teamId} connection id${connectionId} removed.`);
      }
    } else if (connection.meta.isBackup === true) {
      this.storage.playerBackupConnectionList.delete(connection.meta.playerId);
    }

    delete connection.meta;
  }

  onDisconnectPlayer(connectionId: ConnectionId): void {
    try {
      const ws = this.storage.connectionList.get(connectionId);

      ws.close();

      this.log.debug(`Connection id${connectionId} was closed.`);
    } catch (err) {
      this.log.error('onDisconnectPlayer', err);
    }
  }

  onBreakConnection(connectionId: ConnectionId): void {
    try {
      const ws = this.storage.connectionList.get(connectionId);

      ws.close();

      this.log.debug(`Connection id${connectionId} was breaked.`);
    } catch (err) {
      this.log.error('onBreakConnection', err);
    }
  }

  onSendPacket(
    msg: ProtocolPacket,
    connectionId: ConnectionId | ConnectionId[],
    exceptions: ConnectionId[] = null
  ): void {
    const packet = marshalServerMessage(msg);

    if (Array.isArray(connectionId)) {
      for (let index = 0; index < connectionId.length; index += 1) {
        if (exceptions === null || !exceptions.includes(connectionId[index])) {
          this.send(packet, connectionId[index]);
        }
      }
    } else {
      this.send(packet, connectionId);
    }
  }

  protected send(packet: ArrayBuffer, connectionId: ConnectionId): void {
    if (this.app.metrics.collect === true) {
      this.app.metrics.sample.ppsOut += 1;
    }

    try {
      if (!this.storage.connectionList.has(connectionId)) {
        return;
      }

      const ws = this.storage.connectionList.get(connectionId);

      if (ws.getBufferedAmount() !== 0) {
        this.log.debug('WS buffer > 0', ws.getBufferedAmount());
      }

      const result = ws.send(packet, true, true);

      if (!result) {
        this.log.warn(`WS send failed (connection id${connectionId}).`);
      }
    } catch (err) {
      this.log.error('Send packet error:', err.stack);
    }
  }
}
