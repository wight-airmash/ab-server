import { SHIPS_TYPES, SHIPS_ENCLOSE_RADIUS } from '@/constants';
import { PLAYERS_ASSIGN_SPAWN_POSITION } from '@/events';
import { System } from '@/server/system';
import { getRandomInt } from '@/support/numbers';

export default class GamePlayers extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [PLAYERS_ASSIGN_SPAWN_POSITION]: this.onAssignPlayerSpawnPosition,
    };
  }

  onAssignPlayerSpawnPosition(player: any): void {
    let x = 0;
    let y = 0;
    let r = 0;

    if (player.planetype.current === SHIPS_TYPES.PREDATOR) {
      [x, y] = this.storage.predatorSpawnZones.get(
        getRandomInt(0, this.storage.predatorSpawnZones.size - 1)
      );
      r = SHIPS_ENCLOSE_RADIUS.PREDATOR / 2;
    } else if (player.planetype.current === SHIPS_TYPES.GOLIATH) {
      [x, y] = this.storage.goliathSpawnZones.get(
        getRandomInt(0, this.storage.goliathSpawnZones.size - 1)
      );
      r = SHIPS_ENCLOSE_RADIUS.GOLIATH / 2;
    } else if (player.planetype.current === SHIPS_TYPES.COPTER) {
      [x, y] = this.storage.copterSpawnZones.get(
        getRandomInt(0, this.storage.copterSpawnZones.size - 1)
      );
      r = SHIPS_ENCLOSE_RADIUS.COPTER / 2;
    } else if (player.planetype.current === SHIPS_TYPES.TORNADO) {
      [x, y] = this.storage.tornadoSpawnZones.get(
        getRandomInt(0, this.storage.tornadoSpawnZones.size - 1)
      );
      r = SHIPS_ENCLOSE_RADIUS.TORNADO / 2;
    } else if (player.planetype.current === SHIPS_TYPES.PROWLER) {
      [x, y] = this.storage.prowlerSpawnZones.get(
        getRandomInt(0, this.storage.prowlerSpawnZones.size - 1)
      );
      r = SHIPS_ENCLOSE_RADIUS.PROWLER / 2;
    }

    player.position.x = x + getRandomInt(-r, r);
    player.position.y = y + getRandomInt(-r, r);
  }
}
