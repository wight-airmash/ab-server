import { UPGRADES_ACTION_TYPE } from '../../../constants';
import { PLAYERS_UPGRADES_RESET, RESPONSE_PLAYER_UPGRADE } from '../../../events';
import { Player, PlayerId } from '../../../types';
import { System } from '../../system';

export default class GameUpgrades extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [PLAYERS_UPGRADES_RESET]: this.onPlayersUpgradesReset,
    };
  }

  onPlayersUpgradesReset(playerId: PlayerId): void {
    const player = this.storage.playerList.get(playerId);

    player.upgrades.amount = 0;
    player.upgrades.speed = 0;
    player.upgrades.defense = 0;
    player.upgrades.energy = 0;
    player.upgrades.missile = 0;
    this.delay(RESPONSE_PLAYER_UPGRADE, player.id.current, UPGRADES_ACTION_TYPE.LOST);
  }
}

export function applyUpgradeFever(player: Player, fever: Boolean, toggle: Boolean): void {
  if (fever) {
    // if we're toggling this, preserve upgrades.
    if (toggle) {
      // preserve player upgrades
      player.upgrades.amount =
        player.upgrades.amount +
        player.upgrades.speed +
        player.upgrades.defense +
        player.upgrades.energy +
        player.upgrades.missile;
    }

    // apply upgrades
    if (player.bot.current) {
      player.upgrades.speed = 3;
      player.upgrades.defense = 2;
      player.upgrades.energy = 3;
      player.upgrades.missile = 3;
    } else {
      player.upgrades.speed = 5;
      player.upgrades.defense = 5;
      player.upgrades.energy = 5;
      player.upgrades.missile = 5;
    }
  } else if (toggle) {
    // only zero out upgrades when they're toggled - no other time!
    player.upgrades.speed = 0;
    player.upgrades.defense = 0;
    player.upgrades.energy = 0;
    player.upgrades.missile = 0;
  }
}
