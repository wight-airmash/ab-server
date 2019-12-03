/* eslint-disable class-methods-use-this */
import { SERVER_MAX_MOB_ID, MAX_UINT32, SERVER_MIN_MOB_ID, NS_PER_SEC } from '@/constants';
import Logger from '@/logger';
import { GameStorage } from '@/server/storage';
import { MobId, ConnectionId, PlayerId } from '@/types';

export class Helpers {
  /**
   * Reference to game storage.
   */
  protected storage: GameStorage;

  /**
   * Reference to logger.
   */
  protected log: Logger;

  /**
   * Server start time.
   */
  protected startTime: [number, number];

  constructor({ app }) {
    this.storage = app.storage;
    this.log = app.log;
    this.startTime = process.hrtime();
  }

  /**
   * Protocol time format.
   */
  clock(): number {
    const [s, ns] = process.hrtime(this.startTime);

    return Math.ceil((s * NS_PER_SEC + ns) / 10000);
  }

  isPlayerConnected(playerId: PlayerId): boolean {
    if (
      !this.storage.playerMainConnectionList.has(playerId) ||
      !this.storage.playerList.has(playerId)
    ) {
      return false;
    }

    return true;
  }

  isPlayerMuted(playerId: PlayerId): boolean {
    if (!this.storage.playerList.has(playerId)) {
      return false;
    }

    const player = this.storage.playerList.get(playerId);

    if (player.times.unmuteTime > Date.now()) {
      return true;
    }

    return false;
  }

  createConnectionId(): ConnectionId {
    while (this.storage.connectionList.has(this.storage.nextConnectionId)) {
      this.storage.nextConnectionId += 1;

      if (this.storage.nextConnectionId >= MAX_UINT32) {
        this.storage.nextConnectionId = 1;
      }
    }

    if (this.storage.nextConnectionId >= MAX_UINT32) {
      this.storage.nextConnectionId = 1;
    }

    this.storage.nextConnectionId += 1;

    return this.storage.nextConnectionId - 1;
  }

  createServiceMobId(): MobId {
    const id = this.storage.nextServiceMobId;

    this.storage.nextServiceMobId += 1;

    if (this.storage.nextServiceMobId >= SERVER_MIN_MOB_ID) {
      this.log.error('Service mob ID is out of range!');
    }

    return id;
  }

  createMobId(playerName = ''): MobId {
    let mobId = this.storage.nextMobId;

    this.storage.nextMobId += 1;

    if (playerName.length > 0 && this.storage.playerHistoryNameToIdList.has(playerName)) {
      mobId = this.storage.playerHistoryNameToIdList.get(playerName).id;
    }

    while (this.storage.mobIdList.has(mobId)) {
      mobId = this.storage.nextMobId;
      this.storage.nextMobId += 1;
    }

    this.storage.mobIdList.add(mobId);

    if (playerName.length > 0) {
      this.storage.playerHistoryNameToIdList.set(playerName, {
        id: mobId,
        expired: Date.now(),
      });
    }

    if (this.storage.nextMobId >= SERVER_MAX_MOB_ID) {
      this.log.info('Mob ID reached the limit. Reseting.');

      this.storage.nextMobId = SERVER_MIN_MOB_ID;
    }

    if (this.storage.mobIdList.size >= SERVER_MAX_MOB_ID - SERVER_MIN_MOB_ID) {
      this.log.warn('Critical amount of mobs.');
    }

    return mobId;
  }

  convertEarningsToLevel(earnings: number): number {
    return Math.floor(0.0111 * earnings ** 0.5) + 1;
  }
}

export default Helpers;
