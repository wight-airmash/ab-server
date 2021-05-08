import { GAME_TYPES } from '@airbattle/protocol';
import {
  COLLISIONS_MAP_COORDS,
  PLAYERS_ALIVE_STATUSES,
  PLAYERS_HEALTH,
  PLAYERS_SPECTATE_INACTIVITY_MS,
} from '../../constants';
import {
  ERRORS_SPECTATE_INACTIVITY_HEALTH_REQUIRED,
  PLAYERS_ALIVE_UPDATE,
  PLAYERS_SWITCHED_TO_SPECTATE,
  RESPONSE_GAME_SPECTATE,
  RESPONSE_SPECTATE_KILL,
  SPECTATE_EMIT_CHANNEL_EVENTS,
  SPECTATE_ENTER_MODE,
  SPECTATE_NEXT,
  SPECTATE_PLAYER,
  SPECTATE_PREV,
} from '../../events';
import { CHANNEL_SPECTATE } from '../../events/channels';
import { Flag, Player, PlayerId, Viewports } from '../../types';
import { System } from '../system';

export default class GameSpectating extends System {
  private now = 0;

  private playerIds = [];

  private players: Map<PlayerId, Player>;

  private viewports: Viewports;

  private isDelayedCall = false;

  constructor({ app }) {
    super({ app });

    this.players = this.storage.playerList;
    this.viewports = this.storage.viewportList;

    this.listeners = {
      // Channels.
      [SPECTATE_EMIT_CHANNEL_EVENTS]: this.onEmitDelayedSpectateEvents,

      // Events.
      [SPECTATE_ENTER_MODE]: this.switchToSpectate,
      [SPECTATE_NEXT]: this.onSpectateNext,
      [SPECTATE_PLAYER]: this.onSpectatePlayer,
      [SPECTATE_PREV]: this.onSpectatePrev,
    };
  }

  onEmitDelayedSpectateEvents(): void {
    if (this.channel(CHANNEL_SPECTATE).events.length === 0) {
      return;
    }

    this.updateCache();

    this.isDelayedCall = true;
    this.channel(CHANNEL_SPECTATE).emitDelayed();
    this.isDelayedCall = false;
  }

  switchToSpectate(spectatorId: PlayerId): boolean {
    if (!this.helpers.isPlayerConnected(spectatorId)) {
      return false;
    }

    if (!this.isDelayedCall) {
      this.updateCache();
    }

    const spectator = this.players.get(spectatorId);
    const connectionId = this.storage.playerMainConnectionList.get(spectatorId);
    const connection = this.storage.connectionList.get(connectionId);
    let switchToSpectate = false;

    connection.pending.spectate = false;
    clearTimeout(connection.timeouts.respawn);
    connection.pending.respawn = false;

    if (spectator.alivestatus.current === PLAYERS_ALIVE_STATUSES.ALIVE) {
      if (
        spectator.times.lastMove < this.now - PLAYERS_SPECTATE_INACTIVITY_MS &&
        spectator.health.current === PLAYERS_HEALTH.MAX &&
        !spectator.inferno.current &&
        !spectator.planestate.flagspeed
      ) {
        switchToSpectate = true;
      } else {
        this.emit(ERRORS_SPECTATE_INACTIVITY_HEALTH_REQUIRED, connectionId);
      }
    } else if (!spectator.spectate.isActive) {
      switchToSpectate = true;
    }

    if (switchToSpectate) {
      this.storage.playerIdSayBroadcastList.delete(spectatorId);
      this.storage.playerInSpecModeList.add(spectatorId);

      {
        const index = this.playerIds.indexOf(spectatorId);

        if (index !== -1) {
          this.playerIds.splice(index, 1);
        }
      }

      spectator.alivestatus.isLastStateKilled = false;
      spectator.spectate.isActive = true;
      spectator.alivestatus.current = PLAYERS_ALIVE_STATUSES.SPECTATE;

      /**
       * Remove all subscribers-spectators.
       */
      const viewport = this.viewports.get(spectatorId);

      {
        const subsIterator = viewport.subs.values();
        let subscriberId: PlayerId = subsIterator.next().value;

        while (subscriberId !== undefined) {
          this.emit(
            RESPONSE_GAME_SPECTATE,
            this.storage.playerMainConnectionList.get(subscriberId),
            subscriberId
          );

          subscriberId = subsIterator.next().value;
        }
      }

      viewport.subs.clear();

      /**
       * Choose a player to spectate
       */
      let playerId: PlayerId = 0;

      if (
        this.config.server.typeId !== GAME_TYPES.CTF &&
        spectator.deaths.killerId > 0 &&
        this.playerIds.indexOf(spectator.deaths.killerId) !== -1
      ) {
        playerId = spectator.deaths.killerId;
      } else {
        playerId = this.playerIds.length > 0 ? this.playerIds[0] : 0;
      }

      spectator.spectate.current = playerId;
      this.subscribeToViewport(playerId, spectatorId);

      /**
       * Move player hitbox outside of the map.
       */
      spectator.hitbox.current.x = COLLISIONS_MAP_COORDS.MAX_X + 1000;
      spectator.hitbox.current.y = COLLISIONS_MAP_COORDS.MAX_Y + 1000;

      this.emit(RESPONSE_SPECTATE_KILL, connectionId, spectatorId);
      this.emit(RESPONSE_GAME_SPECTATE, connectionId, playerId);
      this.emit(PLAYERS_SWITCHED_TO_SPECTATE, playerId);

      this.delay(PLAYERS_ALIVE_UPDATE);
    }

    return switchToSpectate;
  }

  onSpectatePlayer(spectatorId: PlayerId, playerId: PlayerId): void {
    if (!this.helpers.isPlayerConnected(spectatorId)) {
      return;
    }

    if (!this.isDelayedCall) {
      this.updateCache();
    }

    const spectator = this.players.get(spectatorId);
    const connectionId = this.storage.playerMainConnectionList.get(spectatorId);
    const connection = this.storage.connectionList.get(connectionId);

    connection.pending.spectate = false;

    if (
      !spectator.spectate.isActive ||
      !this.helpers.isPlayerConnected(playerId) ||
      this.storage.playerInSpecModeList.has(playerId)
    ) {
      return;
    }

    this.unsubscribeFromViewport(spectator.spectate.current, spectatorId);
    spectator.spectate.current = playerId;
    this.subscribeToViewport(playerId, spectatorId);

    this.emit(RESPONSE_GAME_SPECTATE, connectionId, playerId);
  }

  onSpectatePrev(spectatorId: PlayerId): void {
    if (!this.helpers.isPlayerConnected(spectatorId)) {
      return;
    }

    if (!this.isDelayedCall) {
      this.updateCache();
    }

    const spectator = this.players.get(spectatorId);
    const connectionId = this.storage.playerMainConnectionList.get(spectatorId);
    const connection = this.storage.connectionList.get(connectionId);

    if (!spectator.spectate.isActive) {
      if (!this.switchToSpectate(spectatorId)) {
        return;
      }
    }

    connection.pending.spectate = false;

    if (this.playerIds.length === 0 || !spectator.spectate.isActive) {
      return;
    }

    const currentIndex = this.playerIds.indexOf(spectator.spectate.current);
    let playerId = spectatorId;

    if (currentIndex !== -1) {
      if (currentIndex - 1 >= 0) {
        playerId = this.playerIds[currentIndex - 1];
      } else {
        playerId = this.playerIds[this.playerIds.length - 1];
      }
    } else {
      [playerId] = this.playerIds;
    }

    if (spectator.spectate.current !== playerId) {
      this.unsubscribeFromViewport(spectator.spectate.current, spectatorId);
      spectator.spectate.current = playerId;
      this.subscribeToViewport(playerId, spectatorId);

      this.emit(RESPONSE_GAME_SPECTATE, connectionId, playerId);
    }
  }

  onSpectateNext(spectatorId: PlayerId): void {
    if (!this.helpers.isPlayerConnected(spectatorId)) {
      return;
    }

    if (!this.isDelayedCall) {
      this.updateCache();
    }

    const spectator = this.players.get(spectatorId);
    const connectionId = this.storage.playerMainConnectionList.get(spectatorId);
    const connection = this.storage.connectionList.get(connectionId);

    if (!spectator.spectate.isActive) {
      if (!this.switchToSpectate(spectatorId)) {
        return;
      }
    }

    connection.pending.spectate = false;

    if (this.playerIds.length === 0 || !spectator.spectate.isActive) {
      return;
    }

    const currentIndex = this.playerIds.indexOf(spectator.spectate.current);
    let playerId = spectatorId;

    if (currentIndex !== -1 && currentIndex + 1 < this.playerIds.length) {
      playerId = this.playerIds[currentIndex + 1];
    } else {
      [playerId] = this.playerIds;
    }

    if (spectator.spectate.current !== playerId) {
      this.unsubscribeFromViewport(spectator.spectate.current, spectatorId);
      spectator.spectate.current = playerId;
      this.subscribeToViewport(playerId, spectatorId);

      this.emit(RESPONSE_GAME_SPECTATE, connectionId, playerId);
    }
  }

  private updateCache(): void {
    const excludeIds = [];

    this.now = Date.now();
    this.playerIds = [];

    /**
     * Add CTF carriers.
     *
     * Note: don't add any personal dependent IDs to `this.playerIds` (like last killer id),
     * this is a common array among all players who want to switch in spectate mode.
     */
    if (this.config.server.typeId === GAME_TYPES.CTF) {
      const blueFlag = this.storage.mobList.get(this.storage.ctfFlagBlueId) as Flag;
      const redFlag = this.storage.mobList.get(this.storage.ctfFlagRedId) as Flag;

      if (blueFlag.owner.current !== 0) {
        this.playerIds.push(blueFlag.owner.current);
        excludeIds.push(blueFlag.owner.current);
      }

      if (redFlag.owner.current !== 0) {
        this.playerIds.push(redFlag.owner.current);
        excludeIds.push(redFlag.owner.current);
      }
    }

    for (let idIndex = 0; idIndex < this.storage.playerRankings.byBounty.length; idIndex += 1) {
      const playerId = this.storage.playerRankings.byBounty[idIndex].id;
      const player = this.storage.playerList.get(playerId);

      if (
        player.alivestatus.current === PLAYERS_ALIVE_STATUSES.ALIVE &&
        excludeIds.indexOf(playerId) === -1
      ) {
        this.playerIds.push(playerId);
      }
    }
  }

  private subscribeToViewport(viewportId: PlayerId, subscriberViewportId: PlayerId): void {
    if (this.viewports.has(viewportId) && viewportId !== subscriberViewportId) {
      const viewport = this.viewports.get(viewportId);
      const subscriberViewport = this.viewports.get(subscriberViewportId);

      viewport.subs.add(subscriberViewportId);

      subscriberViewport.hitbox.x = viewport.hitbox.x;
      subscriberViewport.hitbox.y = viewport.hitbox.y;
    }
  }

  private unsubscribeFromViewport(viewportId: PlayerId, subscriberViewportId: PlayerId): void {
    if (this.viewports.has(viewportId)) {
      const viewport = this.viewports.get(viewportId);

      viewport.subs.delete(subscriberViewportId);
    }
  }
}
