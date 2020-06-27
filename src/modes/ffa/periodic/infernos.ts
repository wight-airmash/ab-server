import { MOB_TYPES } from '@airbattle/protocol';
import { POWERUPS_ADD_PERIODIC, TIMELINE_BEFORE_GAME_START } from '../../../events';
import { System } from '../../../server/system';
import { PeriodicPowerupTemplate } from '../../../types';

export default class InfernosPeriodic extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [TIMELINE_BEFORE_GAME_START]: this.init,
    };
  }

  init(): void {
    this.emit(POWERUPS_ADD_PERIODIC, [
      /**
       * Europe inferno.
       */
      {
        interval: 105,
        posX: 920,
        posY: -2800,
        type: MOB_TYPES.INFERNO,
      } as PeriodicPowerupTemplate,
    ]);

    this.log.debug('Periodic infernos loaded.');
  }
}
