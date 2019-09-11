import { MOB_TYPES } from '@airbattle/protocol';
import { POWERUPS_ADD_PERIODIC, TIMELINE_BEFORE_GAME_START } from '@/events';
import { System } from '@/server/system';
import { PeriodicPowerupTemplate } from '@/types';

export default class ShieldsPeriodic extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [TIMELINE_BEFORE_GAME_START]: this.init,
    };
  }

  init(): void {
    this.emit(POWERUPS_ADD_PERIODIC, [
      /**
       * Blue base shield.
       */
      {
        interval: 105,
        posX: -9300,
        posY: -1480,
        type: MOB_TYPES.SHIELD,
      } as PeriodicPowerupTemplate,

      /**
       * Red base shield.
       */
      {
        interval: 105,
        posX: 8350,
        posY: -935,
        type: MOB_TYPES.SHIELD,
      } as PeriodicPowerupTemplate,
    ]);

    this.log.debug('Periodic shields loaded.');
  }
}
