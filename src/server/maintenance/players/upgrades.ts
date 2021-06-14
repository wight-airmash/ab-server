import { SECONDS_PER_DAY, SECONDS_PER_MINUTE, UPGRADES_ACTION_TYPE } from '../../../constants';
import {
  BROADCAST_CHAT_SERVER_PUBLIC,
  BROADCAST_CHAT_SERVER_WHISPER,
  PLAYERS_CREATED,
  PLAYERS_RESPAWNED,
  PLAYERS_UPGRADES_AUTO_FEVER,
  PLAYERS_UPGRADES_RESET,
  PLAYERS_UPGRADES_TOGGLE_FEVER,
  RESPONSE_PLAYER_UPGRADE,
  TIMELINE_BEFORE_GAME_START,
  TIMELINE_CLOCK_SECOND,
} from '../../../events';
import { CHANNEL_CHAT } from '../../../events/channels';
import { TimeTrigger } from '../../../support/time-trigger';
import { Player, PlayerId, TimeTriggerScheduleItem } from '../../../types';
import { System } from '../../system';

export default class GameUpgrades extends System {
  private feverScheduler: TimeTrigger;

  constructor({ app }) {
    super({ app });

    this.listeners = {
      [PLAYERS_CREATED]: this.onPlayerCreated,
      [PLAYERS_RESPAWNED]: this.onPlayerRespawned,
      [PLAYERS_UPGRADES_RESET]: this.onPlayersUpgradesReset,
      [PLAYERS_UPGRADES_AUTO_FEVER]: this.autoUpgradesFever,
      [PLAYERS_UPGRADES_TOGGLE_FEVER]: this.toggleUpgradesFever,
      [TIMELINE_BEFORE_GAME_START]: this.initFeverConfig,
      [TIMELINE_CLOCK_SECOND]: this.onSecond,
    };
  }

  initFeverConfig(): void {
    let schedule: TimeTriggerScheduleItem[] = [];

    if (typeof process.env.UPGRADES_FEVER_SCHEDULE !== 'undefined') {
      schedule = process.env.UPGRADES_FEVER_SCHEDULE.split(',')
        .map(scheduleItemString => {
          const [second = -1, minute = -1, hour = -1, weekDay = -1, duration = -1] =
            scheduleItemString
              .trim()
              .split(' ')
              .map(v => ~~v);

          if (
            !(
              second >= 0 &&
              second < 60 &&
              minute >= 0 &&
              minute < 60 &&
              hour >= 0 &&
              hour < 24 &&
              weekDay >= 0 &&
              weekDay < 7 &&
              duration > 0 &&
              duration < SECONDS_PER_DAY * 7
            )
          ) {
            this.log.fatal('Invalid upgrades fever schedule format!');

            process.exit(1);
          }

          return {
            weekDay,
            hour,
            minute,
            second,
            duration: duration * SECONDS_PER_MINUTE,
          };
        })
        .sort((a, b) => a.weekDay - b.weekDay);
    }

    this.feverScheduler = new TimeTrigger(schedule);
    this.config.upgrades.fever.auto = true;

    if (schedule.length > 0) {
      this.log.debug('Upgrades fever schedule items loaded: %d', schedule.length);
    }
  }

  onSecond(): void {
    if (this.config.upgrades.fever.auto) {
      this.updateFeverStateBySchedule();
    }
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

    if (this.config.upgrades.fever.active) {
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

  toggleUpgradesFever(bySchedule = true): void {
    this.config.upgrades.fever.auto = bySchedule;
    this.config.upgrades.fever.active = !this.config.upgrades.fever.active;

    this.storage.playerList.forEach(player => {
      if (!this.helpers.isPlayerConnected(player.id.current)) {
        return;
      }

      this.applyUpgradesFever(player, true);
    });

    const verb = this.config.upgrades.fever.active ? 'started' : 'ended';

    this.emit(BROADCAST_CHAT_SERVER_PUBLIC, `Upgrades fever ${verb}.`);
  }

  autoUpgradesFever(): void {
    this.config.upgrades.fever.auto = true;
    this.updateFeverStateBySchedule();
  }

  private updateFeverStateBySchedule(): void {
    const isActive = this.feverScheduler.state(this.app.ticker.now);

    if (isActive !== this.config.upgrades.fever.active) {
      this.toggleUpgradesFever();
    }
  }

  private applyUpgradesFever(player: Player, toggle = false): void {
    let changesEvent = true;

    if (this.config.upgrades.fever.active) {
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
