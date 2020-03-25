import { marshalServerMessage, unmarshalClientMessage } from '@airbattle/protocol';
import { ProtocolPacket } from '@airbattle/protocol/dist/packets';
import {
  CONNECTIONS_AUTO_CLOSE_SECOND_DELAY_MS,
  CONNECTIONS_LAGGING_SAFE_TIMEOUT_MS,
  LIMITS_ANY_WEIGHT,
  SERVER_MIN_MOB_ID,
} from '@/constants';
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
import { ConnectionId, PlayerConnection, PlayerId } from '@/types';

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

  clearLaggingStatus(connectionId: ConnectionId): void {
    if (!this.storage.connectionList.has(connectionId)) {
      return;
    }

    const connection = this.storage.connectionList.get(connectionId);

    connection.meta.lagging = false;
    connection.meta.timeouts.lagging = null;

    this.log.debug('Connection lagging safe time end.', {
      connectionId,
      limits: connection.meta.limits,
    });
  }

  onPacketReceived(msg: ArrayBuffer, connectionId: ConnectionId): void {
    this.app.metrics.packets.in += 1;

    if (this.app.metrics.collect === true) {
      this.app.metrics.sample.ppsIn += 1;
    }

    const connection = this.storage.connectionList.get(connectionId);

    connection.meta.lastMessageMs = Date.now();
    connection.meta.limits.any += LIMITS_ANY_WEIGHT;

    if (connection.meta.isBot === false) {
      if (connection.meta.lagging) {
        if (connection.meta.timeouts.lagging === null) {
          this.log.debug('Connection is lagging, safe time start.', {
            connectionId,
          });

          connection.meta.timeouts.lagging = setTimeout(() => {
            this.clearLaggingStatus(connectionId);
          }, CONNECTIONS_LAGGING_SAFE_TIMEOUT_MS);
        }
      } else {
        this.emit(CONNECTIONS_CHECK_PACKET_LIMITS, connection);
      }
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
    let secondConnectionId: ConnectionId = null;

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
    if (connection.meta.isMain === true) {
      this.channel(CHANNEL_DISCONNECT_PLAYER).delay(PLAYERS_REMOVE, connection.meta.playerId);
      secondConnectionId = this.storage.playerBackupConnectionList.get(connection.meta.playerId);

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
      secondConnectionId = this.storage.playerMainConnectionList.get(connection.meta.playerId);

      this.storage.playerBackupConnectionList.delete(connection.meta.playerId);
    }

    this.storage.connectionList.delete(connectionId);

    delete connection.meta;

    /**
     * In case a player has closed one connection itself,
     * but for some reason left alive the second one.
     */
    if (typeof secondConnectionId !== 'undefined' && secondConnectionId !== null) {
      setTimeout(() => {
        this.onBreakConnection(secondConnectionId);
      }, CONNECTIONS_AUTO_CLOSE_SECOND_DELAY_MS);
    }
  }

  onDisconnectPlayer(playerId: PlayerId): void {
    try {
      this.log.debug(`Disconnecting player...`, { playerId });

      this.onBreakConnection(this.storage.playerMainConnectionList.get(playerId));
    } catch (err) {
      this.log.error('onDisconnectPlayer', err.stack);
    }
  }

  onBreakConnection(connectionId: ConnectionId): void {
    try {
      if (!this.storage.connectionList.has(connectionId)) {
        return;
      }

      const ws = this.storage.connectionList.get(connectionId);
      let ws2: PlayerConnection = null;
      let ws2Id: ConnectionId = null;

      if (ws.meta.playerId !== null) {
        if (ws.meta.isMain) {
          ws2Id = this.storage.playerBackupConnectionList.get(ws.meta.playerId);
        } else {
          ws2Id = this.storage.playerMainConnectionList.get(ws.meta.playerId);
        }

        ws2 = this.storage.connectionList.get(ws2Id);
      }

      try {
        this.log.debug(`Breaking connection...`, { connectionId });

        ws.close();
      } catch (err) {
        this.log.debug(`onBreakConnection first connection`, err.stack);
      }

      if (typeof ws2 !== 'undefined' && ws2 !== null) {
        try {
          this.log.debug(`Breaking connection...`, { connectionId: ws2Id });

          ws2.close();
        } catch (err) {
          this.log.debug(`onBreakConnection second connection`, err.stack);
        }
      }
    } catch (err) {
      this.log.error('onBreakConnection', err.stack);
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
    this.app.metrics.packets.out += 1;

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

      const result = ws.send(packet, true, this.app.config.compression);

      if (!result) {
        this.log.warn(`WS send failed (connection id${connectionId}).`);
      }
    } catch (err) {
      this.log.error('Send packet error:', err.stack);
    }
  }
}
