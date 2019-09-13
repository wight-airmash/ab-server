import { UPGRADES_ACTION_TYPE, UPGRADES_TYPES, PLAYERS_ALIVE_STATUSES } from '@/constants';
import { COMMAND_UPGRADE, ERRORS_NOT_ENOUGH_UPGRADES, RESPONSE_PLAYER_UPGRADE } from '@/events';
import { System } from '@/server/system';
import { MainConnectionId } from '@/types';

export default class UpgradeCommandHandler extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [COMMAND_UPGRADE]: this.onCommandReceived,
    };
  }

  onCommandReceived(connectionId: MainConnectionId, commandArguments: string): void {
    if (!this.storage.connectionList.has(connectionId)) {
      return;
    }

    const upgradeType = ~~commandArguments;

    if (upgradeType > 0 && upgradeType < 5) {
      const connection = this.storage.connectionList.get(connectionId);

      if (!this.helpers.isPlayerConnected(connection.meta.playerId)) {
        return;
      }

      const player = this.storage.playerList.get(connection.meta.playerId);

      if (player.alivestatus.current !== PLAYERS_ALIVE_STATUSES.ALIVE) {
        return;
      }

      if (player.upgrades.amount > 0) {
        const upgradeTypeName = UPGRADES_TYPES[upgradeType].toLowerCase();

        if (player.upgrades[upgradeTypeName] < 5) {
          player.upgrades[upgradeTypeName] += 1;
          player.upgrades.amount -= 1;

          this.emit(
            RESPONSE_PLAYER_UPGRADE,
            connection.meta.playerId,
            UPGRADES_ACTION_TYPE[UPGRADES_TYPES[upgradeType]]
          );

          this.log.debug(
            `Player id${connection.meta.playerId} applied an upgrade type ${upgradeType}.`
          );

          if (upgradeTypeName === 'speed') {
            player.delayed.BROADCAST_PLAYER_UPDATE = true;
          }
        }
      } else {
        this.emit(ERRORS_NOT_ENOUGH_UPGRADES, connectionId);
      }
    }
  }
}
