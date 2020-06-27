import {
  MAP_SIZE,
  PLAYERS_ALIVE_STATUSES,
  PLAYERS_DEATH_INACTIVITY_MS,
  PLAYERS_ENERGY,
  PLAYERS_HEALTH,
  PLAYERS_RESPAWN_INACTIVITY_MS,
  PLAYERS_SPAWN_SHIELD_DURATION_MS,
  SHIPS_TYPES,
} from '../../../constants';
import {
  BROADCAST_PLAYER_RESPAWN,
  BROADCAST_PLAYER_TYPE,
  ERRORS_RESPAWN_INACTIVITY_HEALTH_REQUIRED,
  PLAYERS_APPLY_SHIELD,
  PLAYERS_ASSIGN_SPAWN_POSITION,
  PLAYERS_EMIT_CHANNEL_RESPAWN,
  PLAYERS_REPEL_UPDATE,
  PLAYERS_RESPAWN,
  PLAYERS_RESPAWNED,
  PLAYERS_SET_SHIP_TYPE,
  PLAYERS_UPGRADES_RESET,
  RESPONSE_SPECTATE_KILL,
  VIEWPORTS_UPDATE_POSITION,
} from '../../../events';
import { CHANNEL_RESPAWN_PLAYER } from '../../../events/channels';
import { PlayerId } from '../../../types';
import { System } from '../../system';

export default class GamePlayersRespawn extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      // Channels.
      [PLAYERS_EMIT_CHANNEL_RESPAWN]: this.onEmitDelayedRespawnEvents,

      // Events.
      [PLAYERS_RESPAWN]: this.onRespawnPlayer,
    };
  }

  /**
   * Emit delayed events.
   */
  onEmitDelayedRespawnEvents(): void {
    this.channel(CHANNEL_RESPAWN_PLAYER).emitDelayed();
  }

  /**
   * Respawn player.
   *
   * @param playerId
   * @param requestShipType
   */
  onRespawnPlayer(playerId: PlayerId, requestShipType: number = null): void {
    if (!this.helpers.isPlayerConnected(playerId)) {
      return;
    }

    const now = Date.now();
    const player = this.storage.playerList.get(playerId);
    const connection = this.storage.connectionList.get(
      this.storage.playerMainConnectionList.get(player.id.current)
    );

    connection.pending.respawn = false;

    if (
      player.delayed.RESPAWN ||
      player.alivestatus.current === PLAYERS_ALIVE_STATUSES.DEAD ||
      (player.times.lastMove < now - PLAYERS_RESPAWN_INACTIVITY_MS &&
        player.health.current === PLAYERS_HEALTH.MAX &&
        !player.inferno.current)
    ) {
      if (
        !player.delayed.RESPAWN &&
        player.alivestatus.current === PLAYERS_ALIVE_STATUSES.DEAD &&
        player.times.lastDeath > now - PLAYERS_DEATH_INACTIVITY_MS
      ) {
        return;
      }

      clearTimeout(connection.timeouts.respawn);

      if (player.planestate.flagspeed) {
        return;
      }

      this.storage.playerIdSayBroadcastList.delete(playerId);

      const shipType = requestShipType !== null ? requestShipType : player.planetype.current;
      let isNewShipType = false;

      if (player.planetype.current !== shipType) {
        this.emit(PLAYERS_SET_SHIP_TYPE, player, shipType);

        isNewShipType = true;
      } else if (player.planetype.current === SHIPS_TYPES.GOLIATH) {
        this.emit(PLAYERS_REPEL_UPDATE, player.id.current, player.position.x, player.position.y);
      }

      this.emit(PLAYERS_ASSIGN_SPAWN_POSITION, player);

      player.shield.current = true;
      player.shield.endTime = now + PLAYERS_SPAWN_SHIELD_DURATION_MS;

      player.alivestatus.current = PLAYERS_ALIVE_STATUSES.ALIVE;

      player.energy.current = PLAYERS_ENERGY.DEFAULT;
      player.health.current = PLAYERS_HEALTH.DEFAULT;

      player.velocity.x = 0;
      player.velocity.y = 0;
      player.velocity.isMin = true;
      player.velocity.isMax = false;

      player.rotation.current = 0;

      player.keystate.UP = false;
      player.keystate.DOWN = false;
      player.keystate.LEFT = false;
      player.keystate.RIGHT = false;
      player.keystate.SPECIAL = false;
      player.keystate.STRAFE = false;
      player.keystate.FIRE = false;

      player.delayed.FIRE_ALTERNATE_MISSILE = false;

      player.planestate.boost = false;
      player.planestate.strafe = false;
      player.planestate.repel = false;
      player.planestate.fire = false;
      player.planestate.stealthed = false;
      player.planestate.flagspeed = false;

      player.inferno.current = false;
      player.inferno.endTime = 0;

      const hitbox = this.storage.shipHitboxesCache[shipType][player.rotation.low];

      player.hitbox.width = hitbox.width;
      player.hitbox.height = hitbox.height;
      player.hitbox.x = ~~player.position.x + MAP_SIZE.HALF_WIDTH + hitbox.x;
      player.hitbox.y = ~~player.position.y + MAP_SIZE.HALF_HEIGHT + hitbox.y;
      player.hitbox.current.x = player.hitbox.x - hitbox.x;
      player.hitbox.current.y = player.hitbox.y - hitbox.y;

      player.hitbox.current.setPoints([
        [hitbox.x, hitbox.y],
        [-hitbox.x, hitbox.y],
        [-hitbox.x, -hitbox.y],
        [hitbox.x, -hitbox.y],
      ]);

      this.emit(
        VIEWPORTS_UPDATE_POSITION,
        player.id.current,
        ~~player.position.x,
        ~~player.position.y
      );

      if (player.delayed.RESPAWN) {
        this.emit(PLAYERS_UPGRADES_RESET, player.id.current);
      }

      /**
       * "Kill" the player before type update.
       */
      if (isNewShipType) {
        this.emit(RESPONSE_SPECTATE_KILL, connection.id, player.id.current);
      }

      this.emit(BROADCAST_PLAYER_RESPAWN, player.id.current);

      if (isNewShipType) {
        this.emit(BROADCAST_PLAYER_TYPE, player.id.current, shipType);
      }

      this.emit(PLAYERS_APPLY_SHIELD, player.id.current, PLAYERS_SPAWN_SHIELD_DURATION_MS);

      /**
       * No spectating anymore.
       */
      let isSpectateBefore = false;

      if (player.spectate.isActive) {
        isSpectateBefore = true;
        this.storage.playerInSpecModeList.delete(player.id.current);
        player.spectate.isActive = false;

        if (this.storage.viewportList.has(player.spectate.current)) {
          const viewport = this.storage.viewportList.get(player.spectate.current);

          viewport.subs.delete(player.id.current);
        }

        player.spectate.current = 0;
      }

      player.delayed.RESPAWN = false;

      this.emit(PLAYERS_RESPAWNED, player.id.current, isSpectateBefore);
    } else {
      this.emit(ERRORS_RESPAWN_INACTIVITY_HEALTH_REQUIRED, connection.id);
    }
  }
}
