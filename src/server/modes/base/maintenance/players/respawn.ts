import { Circle } from 'collisions';
import {
  COLLISIONS_OBJECT_TYPES,
  MAP_SIZE,
  PLAYERS_ALIVE_STATUSES,
  PLAYERS_DEATH_INACTIVITY_MS,
  PLAYERS_ENERGY,
  PLAYERS_HEALTH,
  PLAYERS_RESPAWN_INACTIVITY_MS,
  PLAYERS_SPAWN_SHIELD_DURATION_MS,
  REPEL_COLLISIONS,
  SHIPS_SPECS,
  SHIPS_TYPES,
  UPGRADES_ACTION_TYPE,
  UPGRADES_SPECS,
} from '@/constants';
import {
  PLAYERS_ASSIGN_SPAWN_POSITION,
  BROADCAST_PLAYER_RESPAWN,
  BROADCAST_PLAYER_TYPE,
  COLLISIONS_ADD_OBJECT,
  COLLISIONS_REMOVE_OBJECT,
  PLAYERS_APPLY_SHIELD,
  PLAYERS_EMIT_CHANNEL_RESPAWN,
  PLAYERS_RESPAWN,
  PLAYERS_REPEL_UPDATE,
  ERRORS_RESPAWN_INACTIVITY_HEALTH_REQUIRED,
  RESPONSE_PLAYER_UPGRADE,
  RESPONSE_SPECTATE_KILL,
  VIEWPORTS_UPDATE_POSITION,
} from '@/events';
import { CHANNEL_RESPAWN_PLAYER } from '@/server/channels';
import HitCircles from '@/server/components/hit-circles';
import Hitbox from '@/server/components/hitbox';
import Id from '@/server/components/mob-id';
import Position from '@/server/components/position';
import Rotation from '@/server/components/rotation';
import Team from '@/server/components/team';
import Entity from '@/server/entity';
import { System } from '@/server/system';
import { PlayerId } from '@/types';

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

    connection.meta.pending.respawn = false;

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

      clearTimeout(connection.meta.timeouts.respawn);

      if (player.planestate.flagspeed === true) {
        return;
      }

      let isNewType = false;
      let shipType = player.planetype.current;

      if (requestShipType !== null) {
        shipType = requestShipType;
      }

      this.emit(PLAYERS_ASSIGN_SPAWN_POSITION, player);

      if (player.planetype.current !== shipType) {
        /**
         * Delete repel zone
         */
        if (player.planetype.current === SHIPS_TYPES.GOLIATH) {
          const repel = this.storage.repelList.get(player.id.current);

          this.emit(COLLISIONS_REMOVE_OBJECT, repel.hitbox.current);

          repel.destroy();
          this.storage.repelList.delete(player.id.current);
        }

        /**
         * Add repel zone
         */
        if (shipType === SHIPS_TYPES.GOLIATH) {
          const radius = REPEL_COLLISIONS[0][2];
          const repel = new Entity().attach(
            new Id(player.id.current),
            new Position(player.position.x, player.position.y),
            new Team(player.team.current),
            new Rotation(),
            new Hitbox(),
            new HitCircles([...REPEL_COLLISIONS])
          );

          repel.hitbox.x = ~~player.position.x + MAP_SIZE.HALF_WIDTH - radius;
          repel.hitbox.y = ~~player.position.y + MAP_SIZE.HALF_HEIGHT - radius;
          repel.hitbox.height = radius * 2;
          repel.hitbox.width = radius * 2;

          const hitbox = new Circle(repel.hitbox.x + radius, repel.hitbox.y + radius, radius);

          hitbox.id = repel.id.current;
          hitbox.type = COLLISIONS_OBJECT_TYPES.REPEL;
          repel.hitbox.current = hitbox;

          this.emit(COLLISIONS_ADD_OBJECT, repel.hitbox.current);
          this.storage.repelList.set(player.id.current, repel);
        }

        player.planetype.current = shipType;
        isNewType = true;
      } else if (player.planetype.current === SHIPS_TYPES.GOLIATH) {
        this.emit(PLAYERS_REPEL_UPDATE, player.id.current, player.position.x, player.position.y);
      }

      player.shield.current = true;
      player.shield.endTime = now + PLAYERS_SPAWN_SHIELD_DURATION_MS;

      player.alivestatus.current = PLAYERS_ALIVE_STATUSES.ALIVE;

      player.energy.current = PLAYERS_ENERGY.DEFAULT;
      player.health.current = PLAYERS_HEALTH.DEFAULT;

      player.energy.regen =
        SHIPS_SPECS[shipType].energyRegen * UPGRADES_SPECS.ENERGY.factor[player.upgrades.energy];

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
        player.upgrades.speed = 0;
        player.upgrades.defense = 0;
        player.upgrades.energy = 0;
        player.upgrades.missile = 0;
        player.upgrades.amount = 0;

        this.delay(RESPONSE_PLAYER_UPGRADE, player.id.current, UPGRADES_ACTION_TYPE.LOST);
      }

      /**
       * "Kill" the player before type update.
       */
      if (isNewType) {
        player.hitcircles.current = [...SHIPS_SPECS[shipType].collisions];

        this.emit(RESPONSE_SPECTATE_KILL, connection.meta.id, player.id.current);
      }

      this.emit(BROADCAST_PLAYER_RESPAWN, player.id.current);

      if (isNewType) {
        this.emit(BROADCAST_PLAYER_TYPE, player.id.current, shipType);
      }

      this.emit(PLAYERS_APPLY_SHIELD, player.id.current, PLAYERS_SPAWN_SHIELD_DURATION_MS);

      /**
       * No spectating anymore.
       */
      if (player.spectate.isActive === true) {
        this.storage.playerInSpecModeList.delete(player.id.current);
        player.spectate.isActive = false;

        if (this.storage.viewportList.has(player.spectate.current)) {
          const viewport = this.storage.viewportList.get(player.spectate.current);

          viewport.subs.delete(player.id.current);
        }

        player.spectate.current = 0;

        this.log.debug(`Player id${player.id.current} removed from spectators.`);
      }

      player.delayed.RESPAWN = false;

      this.log.debug(`Player id${player.id.current} respawned.`);
    } else {
      this.emit(ERRORS_RESPAWN_INACTIVITY_HEALTH_REQUIRED, connection.meta.id);
    }
  }
}
