import { SERVER_SHUTDOWN_STARTED, TIMELINE_CLOCK_MINUTE } from '../../events';
import { System } from '../system';
import { writeFileSync } from 'fs';

export default class Recovering extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [TIMELINE_CLOCK_MINUTE]: this.periodic,
      [SERVER_SHUTDOWN_STARTED] : this.saveAll
    };
  }

  periodic(): void {
    this.clearExpired();
    this.persist();
  }

  saveAll(err: Error, msg: string): void {
    console.log('saveAll Called')
    console.log(this.storage.playerList.size, 'players')

    for (let [key, player] of this.storage.playerList) {
      console.log(key);
      this.helpers.storePlayerStats(player)
      console.log('done processing', key)
    }
    this.persist()
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

  // The objective of this is to capture the PlayerRecoverList so that server restarts do not cost 
  // players their points. This is a different use case from CTF, where the objective is to allow a 
  // player to come back to the game after a day or two and retain points. 
  // However, the 
  persist(): void {
  // persist writes the recover data to disk
    console.log('persist called')
    let data = JSON.stringify([...this.storage.playerRecoverList.entries()])
    console.log(data)
    
    // TODO: get on-disk location from config
    writeFileSync("/app/data/recovery.json", data)
    console.log('writ.')
  }

}
