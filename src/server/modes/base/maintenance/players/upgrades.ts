import { UPGRADES_ACTION_TYPE } from '@/constants';
import { PLAYERS_UPGRADES_RESET, RESPONSE_PLAYER_UPGRADE } from '@/events';
import { System } from '@/server/system';
import { PlayerId } from '@/types';

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
