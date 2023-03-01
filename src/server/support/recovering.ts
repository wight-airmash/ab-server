import { TIMELINE_SERVER_SHUTDOWN, TIMELINE_CLOCK_MINUTE, TIMELINE_GAME_START, TIMELINE_RECOVERY_COMPLETE } from '../../events';
import { System } from '../system';
import { writeFile, writeFileSync, readFileSync } from 'fs';
import { MobId, PlayerId, PlayerName, PlayerNameHistoryItem, PlayerRecoverItem } from '../../types';

const ASYNC:boolean = true

export default class Recovering extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [TIMELINE_CLOCK_MINUTE]: this.periodic,
      [TIMELINE_GAME_START]: this.restore,
      [TIMELINE_SERVER_SHUTDOWN] : this.saveAll
    };
  }

  periodic(): void {
    this.clearExpired();
    this.persist(ASYNC);
  }

  saveAll(err: Error, msg: string): void {
    this.log.debug("saving all player stats. %s players", this.storage.playerList.size)

    for (let [key, player] of this.storage.playerList) {
      this.helpers.storePlayerStats(player)
    }
    this.persist(!ASYNC)

    // This event must be emitted or the server will hang
    this.events.emit(TIMELINE_RECOVERY_COMPLETE)
  }

  clearExpired(): void {
    const now = Date.now();
    const ids = [...this.storage.playerRecoverList.keys()];

    for (let index = 0; index < ids.length; index += 1) {
      const recover = this.storage.playerRecoverList.get(ids[index]);

      if (recover.expired < now) {
        this.storage.playerRecoverList.delete(ids[index]);
      }
    }
  }

  // restore reads the game cache from disk and loads its members into game storage. 
  restore(): void {

    try {
      var f = readFileSync(this.getCachePath(), 'utf-8');
    } catch (err) {
      this.log.warn('unable to open recovery file. %s', err)
      return
    }
    let data = JSON.parse(f)
    if (data == undefined) {
      this.log.debug('no recovery data found')
      return
    }

    // playerRecoverList: Map<PlayerId, PlayerRecoverItem> = new Map();
    if (data['players']) {
      for (let key in data['players']) {
        this.storage.playerRecoverList.set(parseInt(key), data['players'][key])
      }
      this.log.debug('recovered players list. %s players', [...this.storage.playerRecoverList.values()].length)
    }

    // playerHistoryNameToIdList: Map<PlayerName, PlayerNameHistoryItem> = new Map();
    if (data['playerHistoryNameToIdList']) {
      for (let key in data['playerHistoryNameToIdList']) {
        this.storage.playerHistoryNameToIdList.set(key, data['playerHistoryNameToIdList'][key])
      }
      this.log.debug('recovered playerHistoryNameToIdList. %s entries', [...this.storage.playerHistoryNameToIdList.values()].length)
    }

    // public mobIdList: Set<MobId> = new Set();
    if (data['mobIdList']) {
      for (let n in data['mobIdList']) {
        this.storage.mobIdList.add(data['mobIdList'][n])
      }
      this.log.debug('recovered mobIdList. %s entries', [...this.storage.mobIdList.values()].length)
    }

    if (data['nextMobId'] && data['nextMobId'] > -1) {
      this.storage.nextMobId = data['nextMobId']
      this.log.debug('recovered nextMobId. %s', this.storage.nextMobId)
    }

  }

  // Persist takes the existing playerRecoverList and other necessary data and writes it to a file.
  // the `async` param indicates whether the write call is intended to be blocking or not.
  persist(async:boolean): void {
    // persist writes the recover data to disk
    this.log.debug('persisting player stats. file=%s async=%s', this.getCachePath(), async)

    // This cache is all the things that might need to be persistent between server restarts.
    // Serializing typescript objects to JSON is apparently tricky so there's some loops in here
    // that flip maps into objects. Those loops are reversed in the `restore` function to re-load 
    // storage with data from the prior run.
    //
    // So there's probably a more efficient way to do this, potentially by building it into storage.
    // The other missing piece here is CTF/BTR match info. This might entail pulling just the match 
    // data from gameEntity.match, or we might need to grab leader info as well. 
    //
    let cache = {
      players: {},
      playerHistoryNameToIdList: {},
      mobIdList: [],
      nextMobId: -1,
    }
    for (let [key, value] of this.storage.playerRecoverList) {
      cache['players'][key] = value
    }
    for (let [key, value] of this.storage.playerHistoryNameToIdList) {
      cache['playerHistoryNameToIdList'][key] = value
    }
    cache['mobIdList'] = [...this.storage.mobIdList.values()]
    cache['nextMobId'] = this.storage.nextMobId

    let data = JSON.stringify(cache, null, 1)
    if (async) {
      writeFile(this.getCachePath(), data, (err) => {
        if (err) {
          this.log.error('unable to commit recovery cache. %s', err)
        }
      })
    } else {
      writeFileSync(this.getCachePath(), data)
    }
  }

  getCachePath(): string {
    return this.config.cache.path + '/recovery.json'
  }

}
