import { KeyObject } from 'crypto';
import { SERVER_MIN_MOB_ID, SERVER_MIN_SERVICE_MOB_ID } from '../constants';
import {
  BackupConnectionId,
  BroadcastStorage,
  ConnectionId,
  ConnectionMeta,
  CTFStorage,
  Flag,
  FlagZone,
  Game,
  HitboxCacheItem,
  IPv4,
  MainConnectionId,
  MobId,
  Mountain,
  Player,
  PlayerId,
  PlayerName,
  PlayerNameHistoryItem,
  PlayerRecoverItem,
  Powerup,
  PowerupSpawnChunk,
  Projectile,
  RankingsStorage,
  Repel,
  SpawnZones,
  TeamId,
  UnmuteTime,
  UsersStorage,
  Viewports,
  SyncStorage,
} from '../types';

export class GameStorage {
  /**
   * Game entity.
   */
  public gameEntity: Game;

  /**
   * Ship hitboxes cache.
   */
  public shipHitboxesCache: {
    [shipType: number]: {
      [rotation: string]: HitboxCacheItem;
    };
  } = {};

  /**
   * Projectile hitboxes cache.
   */
  public projectileHitboxesCache: {
    [projectileType: number]: {
      [rotation: string]: HitboxCacheItem;
    };
  } = {};

  /**
   * Powerup/upgrades hitboxes cache.
   */
  public powerupHitboxesCache: {
    [powerupType: number]: { width: number; height: number; x: number; y: number };
  } = {};

  /**
   * CTF flag hitboxes cache.
   */
  public flagHitboxesCache: { width: number; height: number; x: number; y: number };

  /**
   * Used to generate mob identifiers.
   * Use `createMobId` helper to generate ID.
   */
  public nextMobId = SERVER_MIN_MOB_ID;

  /**
   * Service mobs: mountains, CTF flags, server bot, etc.
   * Use `createServiceMobId` helper to generate ID.
   */
  public nextServiceMobId = SERVER_MIN_SERVICE_MOB_ID;

  /**
   * All meta connections (main and backup).
   */
  public connectionList: Map<ConnectionId, ConnectionMeta> = new Map();

  /**
   * All main connection ids map.
   */
  public playerMainConnectionList: Map<PlayerId, MainConnectionId> = new Map();

  /**
   * All backup connection ids map.
   */
  public playerBackupConnectionList: Map<PlayerId, BackupConnectionId> = new Map();

  /**
   * All main connection ids.
   */
  public mainConnectionIdList: Set<MainConnectionId> = new Set();

  /**
   * Human main connection ids.
   */
  public humanConnectionIdList: Set<MainConnectionId> = new Set();

  /**
   * Bot main connection ids.
   */
  public botConnectionIdList: Set<MainConnectionId> = new Set();

  /**
   * Connection ids lists grouped by team.
   */
  public connectionIdByTeam: Map<TeamId, Set<MainConnectionId>> = new Map();

  /**
   * Main connection ids accessible by username.
   * This storage clears not instantly after player disconnection,
   * but on each game loop tick. Don't forget to additionally check
   * that a connection with given ID still exists.
   */
  public connectionIdByNameList: {
    [playerName: string]: MainConnectionId;
  } = {};

  /**
   * All mobs ids (include players).
   */
  public mobIdList: Set<MobId> = new Set();

  /**
   * All bots ids.
   */
  public botIdList: Set<PlayerId> = new Set();

  /**
   * Currently used player names.
   */
  public playerNameList: Set<PlayerName> = new Set();

  /**
   * The player ID is reserved for reuse for a while.
   */
  public playerHistoryNameToIdList: Map<PlayerName, PlayerNameHistoryItem> = new Map();

  /**
   * Player entities.
   */
  public playerList: Map<PlayerId, Player> = new Map();

  /**
   * List of players who broadcast /say messages.
   */
  public playerIdSayBroadcastList: Set<PlayerId> = new Set();

  /**
   * Mob entities (not players and the mobs which have its own storage,
   * like repels and viewports).
   */
  public mobList: Map<
    MobId,
    Player | Repel | Powerup | Flag | FlagZone | Projectile | Mountain
  > = new Map();

  public users: UsersStorage = {
    list: new Map(),
    online: new Map(),
    hasChanges: false,
  };

  /**
   * Repel is a mob with the same as its owner id.
   */
  public repelList: Map<PlayerId, Repel> = new Map();

  /**
   * Who currently sees the mob.
   * It can also be used to determine who is nearby.
   */
  public broadcast: BroadcastStorage = new Map();

  /**
   * Players in spectator mode.
   */
  public playerInSpecModeList: Set<PlayerId> = new Set();

  /**
   * Player data to recover after disconnect.
   */
  public playerRecoverList: Map<PlayerId, PlayerRecoverItem> = new Map();

  public projectileIdList: Set<MobId> = new Set();

  public shieldIdList: Set<MobId> = new Set();

  public infernoIdList: Set<MobId> = new Set();

  public upgradeIdList: Set<MobId> = new Set();

  /**
   * Player viewport list.
   * Viewport with the same as its owner id.
   */
  public viewportList: Viewports = new Map();

  /**
   * Tokens to establish backup connections.
   */
  public backupTokenList: Map<string, PlayerId> = new Map();

  /**
   * Connections counter.
   */
  public connectionByIPCounter: Map<IPv4, number> = new Map();

  /**
   * List of main connections id by IP.
   */
  public connectionByIPList: Map<IPv4, Set<MainConnectionId>> = new Map();

  /**
   * Packet flooding attempts counter.
   */
  public packetFloodingList: Map<IPv4, number> = new Map();

  public ipMuteList: Map<IPv4, UnmuteTime> = new Map();

  public ipBanList: Map<
    IPv4,
    {
      reason: string;
      expire: number;
    }
  > = new Map();

  /**
   * Bots IPs.
   */
  public ipBotList: Set<IPv4> = new Set();

  /**
   * Spawn zone set maps an index and ship type to a collection of pre-generated spawn zones.
   *
   * Index is needed for BTR, which has separate spawn zone boundaries for in match and waiting for match to start.
   */
  public spawnZoneSet: Map<number, Map<number, SpawnZones>> = new Map<
    number,
    Map<number, SpawnZones>
  >();

  /**
   * Pre-generated powerups spawn-zones.
   */
  public powerupSpawns: Map<number, PowerupSpawnChunk> = new Map();

  public serverPlayerId: number = null;

  /**
   * TODO: move in CTF specific storage.
   */
  public ctfFlagBlueId: number = null;

  public ctfFlagRedId: number = null;

  public ctf: CTFStorage = {
    flags: {
      blueId: null,
      redId: null,
    },

    leaders: {
      blueId: null,
      blueUpdatedAt: 0,
      isBlueElections: false,

      redId: null,
      redUpdatedAt: 0,
      isRedElections: false,
    },
  };

  /**
   * Public key from login server
   */
  public loginPublicKey: KeyObject = null;

  public playerRankings: RankingsStorage = {
    outdated: false,
    byBounty: [],

    /**
     * scoreAtNtile returns the score at the Nth percentile from the byBounty array.
     */
    scoreAtPercentile: (n) => {
      let idx = Math.round((this.playerRankings.byBounty.length * (1-n)) - 1) 
      if (idx < this.playerRankings.byBounty.length && idx > 0) {
        return this.playerRankings.byBounty[idx].score;
      }
      return -1
    }
  };

  public gameModeAPIResponse = '';

  public sync: SyncStorage = {
    active: false,
    connectionId: null,
    nextSequenceId: 1,
    thisServerId: null,
    thisServerEndpoint: null,
    updatesAwaitingSequenceId: [],
    updatesAwaitingSend: new Map(),
    updatesAwaitingAck: new Map(),
    updatesAwaitingResend: new Map(),
    subscribedObjects: new Set(),
    hasChanges: false,
  };
}
