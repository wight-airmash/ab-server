import { UPGRADES_ACTION_TYPE } from '../../../constants';
import {
  BROADCAST_CHAT_SERVER_WHISPER,
  PLAYERS_CREATED,
  PLAYERS_RESPAWNED,
  PLAYERS_UPGRADES_RESET,
  PLAYERS_UPGRADES_TOGGLE_FEVER,
  RESPONSE_PLAYER_UPGRADE,
} from '../../../events';
import { CHANNEL_CHAT } from '../../../events/channels';
import { Player, PlayerId } from '../../../types';
import { System } from '../../system';

export default class GameUpgrades extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [PLAYERS_CREATED]: this.onPlayerCreated,
      [PLAYERS_RESPAWNED]: this.onPlayerRespawned,
      [PLAYERS_UPGRADES_RESET]: this.onPlayersUpgradesReset,
      [PLAYERS_UPGRADES_TOGGLE_FEVER]: this.toggleUpgradesFever,
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

  onPlayerCreated(playerId: PlayerId): void {
    this.applyUpgradesFever(this.storage.playerList.get(playerId));

    if (this.config.upgrades.fever) {
      this.channel(CHANNEL_CHAT).delay(
        BROADCAST_CHAT_SERVER_WHISPER,
        playerId,
        'An upgrades fever event is ongoing'
      );
    }
  }

  onPlayerRespawned(playerId: PlayerId): void {
    this.applyUpgradesFever(this.storage.playerList.get(playerId));
  }

  toggleUpgradesFever(): void {
    this.config.upgrades.fever = !this.config.upgrades.fever;

    this.storage.playerList.forEach(player => {
      if (!this.helpers.isPlayerConnected(player.id.current)) {
        return;
      }

      this.applyUpgradesFever(player, true);
    });
  }

  private applyUpgradesFever(player: Player, toggle = false): void {
    let changesEvent = true;

    if (this.config.upgrades.fever) {
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
    } else {
      changesEvent = false;
    }

    if (changesEvent) {
      this.emit(RESPONSE_PLAYER_UPGRADE, player.id.current, UPGRADES_ACTION_TYPE.LOST);
    }
  }
}
