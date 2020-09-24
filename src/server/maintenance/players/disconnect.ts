import { GAME_TYPES } from '@airbattle/protocol';
import { PLAYERS_TIME_TO_RESTORE_PLAYER_MS } from '../../../constants';
import {
  BROADCAST_PLAYER_LEAVE,
  COLLISIONS_REMOVE_OBJECT,
  PLAYERS_BEFORE_REMOVE,
  PLAYERS_EMIT_CHANNEL_DISCONNECT,
  PLAYERS_REMOVE,
  PLAYERS_REMOVED,
  PLAYERS_REPEL_DELETE,
  SYNC_ENQUEUE_UPDATE,
  SYNC_UNSUBSCRIBE,
  VIEWPORTS_REMOVE,
} from '../../../events';
import { CHANNEL_DISCONNECT_PLAYER } from '../../../events/channels';
import { has } from '../../../support/objects';
import { PlayerId } from '../../../types';
import { System } from '../../system';

export default class GamePlayersDisconnect extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      // Channels.
      [PLAYERS_EMIT_CHANNEL_DISCONNECT]: this.onDisconnectPlayers,

      // Events.
      [PLAYERS_REMOVE]: this.removePlayerData,
    };
  }

  /**
   * Emit delayed events.
   */
  onDisconnectPlayers(): void {
    this.channel(CHANNEL_DISCONNECT_PLAYER).emitDelayed();
  }

  /**
   * Remove player data from the game.
   *
   * @param playerId
   */
  removePlayerData(playerId: PlayerId): void {
    if (this.storage.playerList.has(playerId)) {
      const player = this.storage.playerList.get(playerId);

      this.emit(PLAYERS_BEFORE_REMOVE, player);

      /**
       * Recover stats feature.
       * CTF only.
       */
      if (this.config.server.typeId === GAME_TYPES.CTF) {
        this.storage.playerRecoverList.set(playerId, {
          expired: Date.now() + PLAYERS_TIME_TO_RESTORE_PLAYER_MS,
          ip: player.ip.current,
          data: {
            match: this.storage.gameEntity.match.current,
            matchesTotal: player.stats.matchesTotal,
            matchesActivePlayed: player.stats.matchesActivePlayed,

            team: player.team.current,
            type: player.planetype.current,
            alive: player.alivestatus.current,

            captures: player.captures.current,
            capturesTime: player.captures.time,
            recaptures: player.recaptures.current,
            capSaves: player.captures.saves,
            capSavesAfterDeath: player.captures.savesAfterDeath,
            capSavesAfterDrop: player.captures.savesAfterDrop,
            capAttempts: player.captures.attempts,
            capAttemptsFromBase: player.captures.attemptsFromBase,
            capAttemptsFromBaseWithShield: player.captures.attemptsFromBaseWithShield,
            damage: player.damage.current,
            damageBots: player.damage.bots,
            damageHits: player.damage.hits,
            damageHitsToBots: player.damage.hitsToBots,
            damageHitsReceived: player.damage.hitsReceived,
            damageHitsByBots: player.damage.hitsByBots,
            deaths: player.deaths.current,
            deathsByBots: player.deaths.byBots,
            deathsWithFlag: player.deaths.withFlag,
            deathsWithFlagByBots: player.deaths.withFlagByBots,
            health: player.health.current,
            energy: player.energy.current,
            kills: player.kills.current,
            killsBots: player.kills.bots,
            killsWithInferno: player.kills.totalWithInferno,
            killsBotsWithInferno: player.kills.botsWithInferno,
            carriersKills: player.kills.carriers,
            carriersBotsKills: player.kills.carriersBots,
            score: player.score.current,
            fires: player.stats.fires,
            fireProjectiles: player.stats.fireProjectiles,

            pressesTotal: player.keystate.presses.total,
            pressesFire: player.keystate.presses.FIRE,
            pressesUp: player.keystate.presses.UP,
            pressesRight: player.keystate.presses.RIGHT,
            pressesDown: player.keystate.presses.DOWN,
            pressesLeft: player.keystate.presses.LEFT,
            pressesSpecial: player.keystate.presses.SPECIAL,

            x: player.position.x,
            y: player.position.y,
            rot: player.rotation.current,

            upgrades: player.upgrades.amount,
            upgradesCollected: player.upgrades.collected,
            upgradesUsed: player.upgrades.used,

            speedUpgrades: player.upgrades.speed,
            defenseUpgrades: player.upgrades.defense,
            energyUpgrades: player.upgrades.energy,
            missileUpgrades: player.upgrades.missile,

            shieldsCollected: player.shield.collected,
            infernosCollected: player.inferno.collected,

            winsTotal: player.wins.current,
            switches: player.stats.switches,

            joinedAt: player.times.joinedAt,
            lastSwitch: player.times.lastSwitch,
            activePlaying: player.times.activePlaying,
            activePlayingRed: player.times.activePlayingRed,
            activePlayingBlue: player.times.activePlayingBlue,
          },
        });
      }

      delete this.storage.connectionIdByNameList[player.name.current];

      /**
       * Clear player storage.
       */
      this.emit(PLAYERS_REPEL_DELETE, player);

      this.storage.playerIdSayBroadcastList.delete(playerId);
      this.storage.playerInSpecModeList.delete(playerId);
      this.storage.playerNameList.delete(player.name.current);
      this.storage.playerList.delete(playerId);
      this.storage.mobIdList.delete(playerId);
      this.storage.backupTokenList.delete(player.backuptoken.current);
      this.storage.botIdList.delete(playerId);

      if (has(player, 'user')) {
        this.storage.users.online.delete(player.user.id);

        if (this.config.sync.enabled) {
          const eventDetail = { flag: player.flag.current };

          this.emit(
            SYNC_ENQUEUE_UPDATE,
            'user',
            player.user.id,
            {},
            Date.now(),
            ['logout', eventDetail]
          );

          this.emit(SYNC_UNSUBSCRIBE, 'user', player.user.id);
        }
      }

      if (this.storage.viewportList.has(player.spectate.current)) {
        const viewport = this.storage.viewportList.get(player.spectate.current);

        viewport.subs.delete(player.id.current);
      }

      this.emit(VIEWPORTS_REMOVE, playerId);
      this.emit(COLLISIONS_REMOVE_OBJECT, player.hitbox.current);
      this.emit(BROADCAST_PLAYER_LEAVE, playerId);

      this.log.info('Player disconnected and removed from the game: %o', {
        playerId,
      });

      this.emit(PLAYERS_REMOVED, playerId);
    }
  }
}
