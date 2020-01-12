import { System } from '@/server/system';
import { ABILITIES_NAMES, ABILITIES_SPECS, UPGRADES_ACTION_TYPE } from '@/constants';

import { RESPONSE_COMMAND_REPLY, RESPONSE_PLAYER_UPGRADE, COMMAND_ABILITIES } from '@/events';
import { MainConnectionId } from '@/types';
import Ability from '@/server/components/ability';

export default class AbilitiesCommandHandler extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [COMMAND_ABILITIES]: this.onCommandReceived,
    };
  }

  onCommandReceived(connectionId: MainConnectionId, command = ''): void {
    const connection = this.storage.connectionList.get(connectionId);

    if (!this.helpers.isPlayerConnected(connection.meta.playerId)) {
      return;
    }

    const player = this.storage.playerList.get(connection.meta.playerId);

    if (command.startsWith('buy')) {
      const abilityName = command.substring(4);

      if (!(abilityName in ABILITIES_NAMES)) {
        this.emit(RESPONSE_COMMAND_REPLY, connectionId, 'No such ability.');

        return;
      }

      const abilityType = ABILITIES_NAMES[abilityName];
      const specs = ABILITIES_SPECS[abilityType];

      if (specs.forShips.indexOf(player.planetype.current) === -1) {
        this.emit(
          RESPONSE_COMMAND_REPLY,
          connectionId,
          'Your plane does not support this ability.'
        );

        return;
      }

      if (player.upgrades.amount < specs.cost) {
        this.emit(RESPONSE_COMMAND_REPLY, connectionId, 'You do not have enough boxes.');

        return;
      }

      player.upgrades.amount -= specs.cost;
      this.emit(RESPONSE_PLAYER_UPGRADE, connection.meta.playerId, UPGRADES_ACTION_TYPE.LOST);

      player.ability = new Ability(abilityType);

      this.emit(RESPONSE_COMMAND_REPLY, connectionId, 'OK.');
    }
  }
}
