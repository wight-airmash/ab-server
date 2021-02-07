import { CLIENT_PACKETS, unmarshalClientMessage } from '@airbattle/protocol';
import {
  CONNECTIONS_AUTO_CLOSE_SECOND_DELAY_MS,
  CONNECTIONS_LAGGING_DROP_INTERVAL_MS,
  CONNECTIONS_STATUS,
  LIMITS_ANY_WEIGHT,
  MS_PER_SEC,
  SERVER_MIN_MOB_ID,
} from '../constants';
import {
  CONNECTIONS_CHECK_PACKET_LIMITS,
  CONNECTIONS_CLOSE,
  CONNECTIONS_CLOSED,
  CONNECTIONS_DISCONNECT,
  CONNECTIONS_DISCONNECT_PLAYER,
  CONNECTIONS_KICK,
  CONNECTIONS_PACKET_RECEIVED,
  ERRORS_PACKET_DECODE_FAILED,
  PLAYERS_REMOVE,
  ROUTE_PACKET,
  SYNC_CONNECTION_INACTIVE,
} from '../events';
import { CHANNEL_DISCONNECT_PLAYER } from '../events/channels';
import { ConnectionId, ConnectionMeta, PlayerId } from '../types';
import { System } from './system';

export default class Connections extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [CONNECTIONS_CLOSED]: this.onConnectionClosed,
      [CONNECTIONS_DISCONNECT_PLAYER]: this.onDisconnectPlayer,
      [CONNECTIONS_DISCONNECT]: this.onBreakConnection,
      [CONNECTIONS_PACKET_RECEIVED]: this.onPacketReceived,
      [ERRORS_PACKET_DECODE_FAILED]: this.onPacketDecodeFailed,
    };
  }

  clearLaggingStatus(connectionId: ConnectionId): void {
    if (!this.storage.connectionList.has(connectionId)) {
      return;
    }

    const connection = this.storage.connectionList.get(connectionId);

    connection.lagging.isActive = false;
    connection.lagging.detects += 1;
    connection.lagging.lastDuration = Date.now() - connection.lagging.lastAt;
    connection.timeouts.lagging = null;

    this.log.debug('Connection lagging packets dropping end: %o', {
      connectionId,
      limits: connection.limits,
    });
  }

  onPacketReceived(msg: ArrayBuffer, connectionId: ConnectionId): void {
    this.app.metrics.packets.in += 1;
    this.app.metrics.transfer.inB += msg.byteLength;

    if (this.app.metrics.collect) {
      this.app.metrics.sample.ppsIn += 1;
      this.app.metrics.sample.tIn += msg.byteLength;
    }

    const connection = this.storage.connectionList.get(connectionId);

    if (connection.status !== CONNECTIONS_STATUS.ESTABLISHED) {
      return;
    }

    connection.lastPacketAt = Date.now();
    connection.limits.any += LIMITS_ANY_WEIGHT;

    if (!connection.isBot && !(connection.isSync && connection.sync.init.complete)) {
      if (connection.lagging.isActive) {
        if (connection.timeouts.lagging === null) {
          this.log.debug('Connection is lagging, packets dropping start: %o', {
            connectionId,
          });

          connection.timeouts.lagging = setTimeout(() => {
            this.clearLaggingStatus(connectionId);
          }, CONNECTIONS_LAGGING_DROP_INTERVAL_MS);
        }
      } else {
        this.emit(CONNECTIONS_CHECK_PACKET_LIMITS, connection);
      }
    }

    try {
      const decodedMsg = unmarshalClientMessage(msg);

      if (connection.lagging.isActive) {
        if (decodedMsg.c === CLIENT_PACKETS.ACK || decodedMsg.c === CLIENT_PACKETS.KEY) {
          connection.limits.any -= LIMITS_ANY_WEIGHT;
          connection.lagging.packets += 1;
          this.app.metrics.lagPackets += 1;

          if (decodedMsg.c === CLIENT_PACKETS.ACK) {
            return;
          }
        }
      }

      this.emit(ROUTE_PACKET, decodedMsg, connectionId);
    } catch (err) {
      this.log.warn('Message decoding failed: %o', { connectionId, error: err.stack });

      this.emit(ERRORS_PACKET_DECODE_FAILED, connectionId);
    }
  }

  onPacketDecodeFailed(connectionId: ConnectionId): void {
    this.emit(CONNECTIONS_KICK, connectionId);
  }

  /**
   * One of the connections (main or backup or sync) was closed.
   *
   * @param connectionId
   */
  onConnectionClosed(connectionId: ConnectionId): void {
    const connection = this.storage.connectionList.get(connectionId);
    const { ip } = connection;
    let secondConnectionId: ConnectionId = null;

    if (connection.status > CONNECTIONS_STATUS.OPENED) {
      const connectionsPerIP = this.storage.connectionByIPCounter.get(ip) - 1;

      if (connectionsPerIP === 0) {
        this.storage.connectionByIPCounter.delete(ip);
      } else {
        this.storage.connectionByIPCounter.set(ip, connectionsPerIP);
      }
    }

    this.storage.connectionList.delete(connectionId);

    /**
     * Stop timers.
     */
    Object.keys(connection.timeouts).forEach(timeout => {
      clearTimeout(connection.timeouts[timeout]);
    });

    Object.keys(connection.periodic).forEach(periodic => {
      clearTimeout(connection.periodic[periodic]);
    });

    /**
     * Remove all connection data.
     */
    if (connection.isMain) {

      // Not confident this is a good approach.
      // Delaying the disconnect event (if runnerDisconnectDelay is set) to keep players in the 
      // game for a few seconds. This prevents runners from disconnecting / reloading to keep their leaderboard standing.

      // Nuke the player's motion
      if (this.config.connections.runnerDisconnectDelay > 0) {
        let player = this.storage.playerList.get(connection.playerId)
        player.keystate.DOWN = false
        player.keystate.UP = false
        player.keystate.LEFT = false
        player.keystate.RIGHT = false
        player.keystate.SPECIAL = false
        player.keystate.FIRE = false
        player.shield.current = false
        player.delayed.BROADCAST_PLAYER_UPDATE = true
      }

      let ctx = this;
      setTimeout(function() {
        ctx.channel(CHANNEL_DISCONNECT_PLAYER).delay(PLAYERS_REMOVE, connection.playerId);
        secondConnectionId = ctx.storage.playerBackupConnectionList.get(connection.playerId);

        ctx.storage.mainConnectionIdList.delete(connectionId);
        ctx.storage.humanConnectionIdList.delete(connectionId);
        ctx.storage.botConnectionIdList.delete(connectionId);
        ctx.storage.playerMainConnectionList.delete(connection.playerId);

        if (ctx.storage.connectionByIPList.has(connection.ip)) {
          const ipConnections = ctx.storage.connectionByIPList.get(connection.ip);

          ipConnections.delete(connectionId);

          if (ipConnections.size === 0) {
            ctx.storage.connectionByIPList.delete(connection.ip);
          }
        }

        if (connection.teamId !== null && ctx.storage.connectionIdByTeam.has(connection.teamId)) {
          const teamConnections = ctx.storage.connectionIdByTeam.get(connection.teamId);

          teamConnections.delete(connectionId);

          if (teamConnections.size === 0 && connection.teamId >= SERVER_MIN_MOB_ID) {
            ctx.storage.connectionIdByTeam.delete(connection.teamId);
          }
        }

      }, this.config.connections.runnerDisconnectDelay * MS_PER_SEC);




    } else if (connection.isBackup) {
      secondConnectionId = this.storage.playerMainConnectionList.get(connection.playerId);

      this.storage.playerBackupConnectionList.delete(connection.playerId);
    } else if (connection.isSync) {
      /**
       * Only remove stored sync connection if it matches the active one.
       */
      if (this.storage.sync.connectionId === connectionId) {
        this.storage.sync.connectionId = null;
        this.storage.sync.active = false;
        this.emit(SYNC_CONNECTION_INACTIVE);
      }
    }

    this.storage.connectionList.delete(connectionId);

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
      this.log.debug('Disconnecting player: %o', { playerId });

      this.onBreakConnection(this.storage.playerMainConnectionList.get(playerId));
    } catch (err) {
      this.log.error('Error while player disconnecting: %o', { error: err.stack });
    }
  }

  onBreakConnection(connectionId: ConnectionId): void {
    try {
      if (!this.storage.connectionList.has(connectionId)) {
        return;
      }

      const ws = this.storage.connectionList.get(connectionId);
      let ws2: ConnectionMeta = null;
      let connectionId2: ConnectionId = null;

      if (ws.playerId !== null) {
        if (ws.isMain) {
          connectionId2 = this.storage.playerBackupConnectionList.get(ws.playerId);
        } else {
          connectionId2 = this.storage.playerMainConnectionList.get(ws.playerId);
        }

        ws2 = this.storage.connectionList.get(connectionId2);
      }

      try {
        this.emit(CONNECTIONS_CLOSE, connectionId);
      } catch (err) {
        this.log.debug('Connection 1 breaking error: %o', { connectionId, error: err.stack });
      }

      if (typeof ws2 !== 'undefined' && ws2 !== null) {
        try {
          this.emit(CONNECTIONS_CLOSE, connectionId2);
        } catch (err) {
          this.log.debug('Connection 2 breaking error: %o', {
            connectionId: connectionId2,
            error: err.stack,
          });
        }
      }
    } catch (err) {
      this.log.error('Connection breaking error: %o', { connectionId, error: err.stack });
    }
  }
}
