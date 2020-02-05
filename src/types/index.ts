import { MOB_TYPES } from '@airbattle/protocol';
import { Polygon } from 'collisions';
import { WebSocket } from 'uWebSockets.js';
import { CONNECTIONS_STATUS } from '@/constants';

export interface HitboxCacheItem {
  width: number;
  height: number;
  x: number;
  y: number;
}

/**
 * Spawn zone is a circle which doesn't intersect with anything.
 *
 * Map<zoneIndex, [circleCenterX, circleCenterY]>
 */
export type SpawnZones = Map<number, [number, number]>;

export interface PowerupSpawnChunk {
  /**
   * Amount of powerups in the chunk on the map.
   */
  spawned: number;

  /**
   * Last spawn time, ms.
   */
  last: number;

  /**
   * Currently not used.
   */
  attend: number;

  /**
   * Predefined spawn zones.
   */
  zones: SpawnZones;
}

export type ConnectionId = number;

export type MainConnectionId = ConnectionId;

export type BackupConnectionId = ConnectionId;

export type MobId = number;

export type PlayerId = MobId;

export type TeamId = number;

export type PlayerName = string;

export type ViewportId = PlayerId;

export type IPv4 = string;

export type UserId = string;

/**
 * Time in ms.
 */
export type UnmuteTime = number;

export interface PlayerRecoverItem {
  expired: number;
  ip: IPv4;
  data: any;
}

export interface PlayerNameHistoryItem {
  id: PlayerId;
  expired: number;
}

export interface Viewport {
  hitbox: Polygon;
  subs: Set<ViewportId>;
  joined: Set<MobId>;
  current: Set<MobId>;
  leaved: Set<MobId>;
  horizonX: number;
  horizonY: number;
}

export type Viewports = Map<ViewportId, Viewport>;

export interface ConnectionMeta {
  id: ConnectionId;

  ip: IPv4;
  headers: { [title: string]: string };

  isBackup: boolean;
  isMain: boolean;
  status: CONNECTIONS_STATUS;

  isBot: boolean;
  playerId: PlayerId;
  teamId: TeamId;
  userId: UserId;

  lastMessageMs: number;
  createdAt: number;
  periodic: {
    ping: NodeJS.Timeout;
  };

  timeouts: {
    login: NodeJS.Timeout;
    ack: NodeJS.Timeout;
    backup: NodeJS.Timeout;
    pong: NodeJS.Timeout;
    respawn: NodeJS.Timeout;
  };

  pending: {
    login: boolean;
    respawn: boolean;
    spectate: boolean;
  };

  limits: {
    any: number;
    chat: number;
    key: number;
    respawn: number;
    spectate: number;
    su: number;
    debug: number;
    spam: number;
  };
}

export interface PlayerConnection extends WebSocket {
  meta?: ConnectionMeta;
}

export interface PeriodicPowerupTemplate {
  /**
   * Respawn interval, seconds.
   */
  interval: number;
  posX: number;
  posY: number;

  /**
   * Shield or inferno.
   */
  type: MOB_TYPES;
}

export interface PeriodicPowerup extends PeriodicPowerupTemplate {
  mobId: MobId;

  /**
   * ms.
   */
  lastUpdate: number;

  /**
   * Periodic powerups are always permanent (not despawn).
   */
  permanent: boolean;
}

type AuthTokenJsonData = string;

type AuthTokenSignature = string;

export type AuthToken = [AuthTokenJsonData, AuthTokenSignature];

export type AuthTokenData = {
  uid: string;
  ts: number;
  for: string;
};

export interface MissileTemplate {
  type: MOB_TYPES;
  x: number;
  y: number;
  rot: number;
  alt: boolean;
}

export interface FireTemplate {
  [key: string]: MissileTemplate[];
}

export interface SpawnZone {
  MIN_X: number;
  MIN_Y: number;
  MAX_X: number;
  MAX_Y: number;
}

export interface SpawnZonesTemplate {
  [key: number]: SpawnZone[];
}

export interface RankingsStorage {
  outdated: boolean;
  byBounty: PlayerId[];
}
