import { SHARED_COMPRESSOR } from 'uWebSockets.js';
import {
  BYTES_PER_KB,
  MS_PER_SEC,
  MINUTES_PER_HOUR,
  SECONDS_PER_MINUTE,
  HOURS_PER_DAY,
} from '@/constants/units';

export const CONNECTIONS_WEBSOCKETS_COMPRESSION = true;

export const CONNECTIONS_WEBSOCKETS_COMPRESSOR = SHARED_COMPRESSOR;

export enum CONNECTIONS_STATUS {
  /**
   * The connection is opened. No checks have been passed yet.
   * All packets from clients with this status are rejected.
   */
  OPENED = 1,

  /**
   * The connection is opened and allowed to send packets.
   */
  ESTABLISHED = 10,

  /**
   * The connection was marked for closing soon
   * and not allowed to send packets. Server can send packets.
   */
  PENDING_TO_CLOSE = 20,

  /**
   * The connection is in the process of closing.
   * It will be closed as soon as possible.
   * Server still can send packets.
   */
  PRECLOSED = 101,

  /**
   * The connection is closed. Neither sending nor receiving are available.
   */
  CLOSED = 201,
}

export const CONNECTIONS_DEFAULT_MAX_PLAYERS_PER_IP = 3;

export const CONNECTIONS_MAX_PAYLOAD_BYTES = 20 * BYTES_PER_KB;

export const CONNECTIONS_IDLE_TIMEOUT_SEC = 15;

export const CONNECTIONS_IDLE_TIMEOUT_MS = CONNECTIONS_IDLE_TIMEOUT_SEC * MS_PER_SEC;

export const CONNECTIONS_PLAYERS_TO_CONNECTIONS_MULTIPLIER = 2;

export const CONNECTIONS_MAX_MESSAGES_PER_CONNECTION_PER_THROTTLE_LIMIT = 300;

export const CONNECTIONS_PACKET_PING_INTERVAL_MS = 5 * MS_PER_SEC;

export const CONNECTIONS_PACKET_LOGIN_TIMEOUT_MS = 3 * MS_PER_SEC;

export const CONNECTIONS_PACKET_ACK_TIMEOUT_MS = 10 * MS_PER_SEC;

export const CONNECTIONS_PACKET_BACKUP_TIMEOUT_MS = 3 * MS_PER_SEC;

export const CONNECTIONS_PACKET_PONG_TIMEOUT_MS = 5 * MS_PER_SEC;

export const CONNECTIONS_FLOODING_AUTOBAN = true;

export const CONNECTIONS_FLOOD_DETECTS_TO_BAN = 2;

export const CONNECTIONS_FLOODING_BAN_MS = 24 * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SEC;

export const CONNECTIONS_SUPERUSER_BAN_MS =
  365 * HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SEC;

export const CONNECTIONS_INVALID_PROTOCOL_AUTOKICK = true;

export const CONNECTIONS_AUTO_CLOSE_SECOND_DELAY_MS = 16;

export const CONNECTIONS_LAGGING_DEFINE_VALUE_MS = 1500;

export const CONNECTIONS_LAGGING_DROP_INTERVAL_MS = 100;

export const CONNECTIONS_LAG_PACKETS_TO_DISCONNECT = 2000;
