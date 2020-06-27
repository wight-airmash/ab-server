import { CLIENT_PACKETS, ProtocolPacket } from '@airbattle/protocol';
import {
  ERRORS_PACKET_FLOODING_DETECTED,
  ROUTE_ACK,
  ROUTE_BACKUP,
  ROUTE_CHAT,
  ROUTE_COMMAND,
  ROUTE_HORIZON,
  ROUTE_KEY,
  ROUTE_LOGIN,
  ROUTE_NOT_FOUND,
  ROUTE_PACKET,
  ROUTE_PONG,
  ROUTE_SAY,
  ROUTE_SCOREDETAILED,
  ROUTE_TEAMCHAT,
  ROUTE_VOTEMUTE,
  ROUTE_WHISPER,
} from '../events';
import { ConnectionId } from '../types';
import { System } from './system';

export default class PacketRouter extends System {
  /**
   * Main connection routes.
   */
  protected routes: { [packetId: number]: string };

  /**
   * Backup connection routes.
   */
  protected backupRoutes: { [packetId: number]: string };

  /**
   * Packet ids valid for main connections.
   */
  protected validPackets: readonly number[];

  /**
   * Packet ids valid for backup connections.
   */
  protected validBackupPackets: readonly number[];

  constructor({ app }) {
    super({ app });

    this.listeners = {
      [ROUTE_PACKET]: this.onRouteMessage,
      [ROUTE_NOT_FOUND]: this.onRouteNotFound,
    };

    this.routes = Object.freeze({
      [CLIENT_PACKETS.ACK]: ROUTE_ACK,

      [CLIENT_PACKETS.BACKUP]: ROUTE_BACKUP,

      [CLIENT_PACKETS.CHAT]: ROUTE_CHAT,

      [CLIENT_PACKETS.COMMAND]: ROUTE_COMMAND,

      [CLIENT_PACKETS.HORIZON]: ROUTE_HORIZON,

      [CLIENT_PACKETS.KEY]: ROUTE_KEY,

      [CLIENT_PACKETS.LOGIN]: ROUTE_LOGIN,

      [CLIENT_PACKETS.PONG]: ROUTE_PONG,

      [CLIENT_PACKETS.SAY]: ROUTE_SAY,

      [CLIENT_PACKETS.SCOREDETAILED]: ROUTE_SCOREDETAILED,

      [CLIENT_PACKETS.TEAMCHAT]: ROUTE_TEAMCHAT,

      [CLIENT_PACKETS.VOTEMUTE]: ROUTE_VOTEMUTE,

      [CLIENT_PACKETS.WHISPER]: ROUTE_WHISPER,
    });

    this.backupRoutes = Object.freeze({
      [CLIENT_PACKETS.BACKUP]: ROUTE_BACKUP,

      [CLIENT_PACKETS.ACK]: ROUTE_ACK,

      [CLIENT_PACKETS.KEY]: ROUTE_KEY,
    });

    this.validPackets = Object.freeze(Object.keys(this.routes).map(packetId => ~~packetId));
    this.validBackupPackets = Object.freeze(
      Object.keys(this.backupRoutes).map(packetId => ~~packetId)
    );
  }

  onRouteMessage(msg: ProtocolPacket, connectionId: ConnectionId): void {
    if (!this.storage.connectionList.has(connectionId)) {
      return;
    }

    const connection = this.storage.connectionList.get(connectionId);

    if (connection.isBackup) {
      if (this.validBackupPackets.includes(msg.c)) {
        this.emit(this.backupRoutes[msg.c], connectionId, msg);
      } else {
        this.emit(ROUTE_NOT_FOUND, connectionId);
      }
    } else if (this.validPackets.includes(msg.c)) {
      this.emit(this.routes[msg.c], connectionId, msg);
    } else {
      this.emit(ROUTE_NOT_FOUND, connectionId);
    }
  }

  onRouteNotFound(connectionId: ConnectionId): void {
    this.emit(ERRORS_PACKET_FLOODING_DETECTED, connectionId);
  }
}
