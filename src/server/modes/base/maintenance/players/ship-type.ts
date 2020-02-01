import { PLAYERS_SET_SHIP_TYPE, PLAYERS_REPEL_DELETE, PLAYERS_REPEL_ADD } from '@/events';
import Entity from '@/server/entity';
import { System } from '@/server/system';
import { SHIPS_SPECS, SHIPS_TYPES } from '@/constants';

export default class GamePlayersShipType extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [PLAYERS_SET_SHIP_TYPE]: this.onSetPlayerShipType,
    };
  }

  onSetPlayerShipType(player: Entity, shipType: number): void {
    const previousType = player.planetype.current;

    player.planetype.current = shipType;
    player.hitcircles.current = [...SHIPS_SPECS[shipType].collisions];

    if (previousType === SHIPS_TYPES.GOLIATH) {
      this.emit(PLAYERS_REPEL_DELETE, player);
    }

    if (shipType === SHIPS_TYPES.GOLIATH) {
      this.emit(PLAYERS_REPEL_ADD, player);
    }

    this.log.debug('Set player ship type.', {
      playerId: player.id.current,
      type: shipType,
    });
  }
}
