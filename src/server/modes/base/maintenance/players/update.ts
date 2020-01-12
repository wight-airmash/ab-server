import { CTF_TEAMS, FLAGS_ISO_TO_CODE } from '@airbattle/protocol';
import { Polygon } from 'collisions';

import {
  COLLISIONS_OBJECT_TYPES,
  LIMITS_ANY_DECREASE_WEIGHT,
  LIMITS_DEBUG_DECREASE_WEIGHT,
  LIMITS_KEY_DECREASE_WEIGHT,
  LIMITS_RESPAWN_DECREASE_WEIGHT,
  LIMITS_SPECTATE_DECREASE_WEIGHT,
  LIMITS_SU_DECREASE_WEIGHT,
  MAP_SIZE,
  PI_X2,
  PLAYERS_ALIVE_STATUSES,
  PLAYERS_BROADCAST_UPDATE_INTERVAL_MS,
  PLAYERS_ENERGY,
  PLAYERS_HEALTH,
  PLAYERS_INACTIVITY_VELOCITY_COORD_VALUE,
  PLAYERS_POSITION,
  PROJECTILES_COLLISIONS,
  PROJECTILES_SPECS,
  SERVER_MIN_MOB_ID,
  SHIPS_FIRE_MODES,
  SHIPS_FIRE_TYPES,
  SHIPS_SPECS,
  SHIPS_TYPES,
  UPGRADES_SPECS,
  ABILITIES_SPECS,
} from '@/constants';
import {
  BROADCAST_EVENT_BOOST,
  BROADCAST_EVENT_STEALTH,
  BROADCAST_PLAYER_FIRE,
  BROADCAST_PLAYER_FLAG,
  BROADCAST_PLAYER_UPDATE,
  COLLISIONS_ADD_OBJECT,
  CTF_PLAYER_DROP_FLAG,
  PLAYERS_EMIT_CHANNEL_FLAG,
  PLAYERS_REPEL_UPDATE,
  PLAYERS_UPDATE,
  PLAYERS_UPDATE_FLAG,
  PLAYERS_UPDATE_TEAM,
  RESPONSE_COMMAND_REPLY,
  TIMELINE_CLOCK_SECOND,
  VIEWPORTS_UPDATE_POSITION,
} from '@/events';
import { CHANNEL_UPDATE_PLAYER_FLAG } from '@/server/channels';
import Acceleration from '@/server/components/acceleration';
import Damage from '@/server/components/damage';
import Delayed from '@/server/components/delayed';
import Distance from '@/server/components/distance';
import HitCircles from '@/server/components/hit-circles';
import Hitbox from '@/server/components/hitbox';
import Inferno from '@/server/components/inferno-powerup';
import Id from '@/server/components/mob-id';
import MobType from '@/server/components/mob-type';
import Owner from '@/server/components/owner';
import Position from '@/server/components/position';
import Repel from '@/server/components/repel';
import Rotation from '@/server/components/rotation';
import Team from '@/server/components/team';
import Velocity from '@/server/components/velocity';
import Entity from '@/server/entity';
import { System } from '@/server/system';
import { has } from '@/support/objects';
import { PlayerId, TeamId } from '@/types';

export default class GamePlayersUpdate extends System {
  protected isUpdatePerSecondLimits: boolean;

  constructor({ app }) {
    super({ app });

    this.listeners = {
      // Channels.
      [PLAYERS_EMIT_CHANNEL_FLAG]: this.onEmitDelayedFlagUpdateEvents,

      // Events.
      [PLAYERS_UPDATE_FLAG]: this.onUpdatePlayerFlag,
      [PLAYERS_UPDATE_TEAM]: this.onUpdatePlayerTeam,
      [PLAYERS_UPDATE]: this.onUpdatePlayers,
      [TIMELINE_CLOCK_SECOND]: this.onSecondTick,
    };
  }

  /**
   * Emit delayed events.
   */
  onEmitDelayedFlagUpdateEvents(): void {
    this.channel(CHANNEL_UPDATE_PLAYER_FLAG).emitDelayed();
  }

  onSecondTick(): void {
    this.isUpdatePerSecondLimits = true;
  }

  /**
   * Set new player flag.
   *
   * @param playerId
   * @param flagIso
   */
  onUpdatePlayerFlag(playerId: PlayerId, flagIso = ''): void {
    if (!this.helpers.isPlayerConnected(playerId)) {
      return;
    }

    if (has(FLAGS_ISO_TO_CODE, flagIso.toUpperCase())) {
      const player = this.storage.playerList.get(playerId);

      player.flag.current = flagIso;

      this.emit(BROADCAST_PLAYER_FLAG, playerId);
    } else {
      this.emit(
        RESPONSE_COMMAND_REPLY,
        this.storage.playerMainConnectionList.get(playerId),
        'Unknown flag.'
      );
    }
  }

  /**
   * Update player team.
   *
   * @param playerId
   * @param teamId
   */
  onUpdatePlayerTeam(playerId: PlayerId, teamId: TeamId): void {
    if (!this.helpers.isPlayerConnected(playerId)) {
      return;
    }

    const player = this.storage.playerList.get(playerId);
    const prevTeamId = player.team.current;

    if (prevTeamId === teamId) {
      return;
    }

    player.team.current = teamId;

    if (this.storage.repelList.has(playerId)) {
      const repel = this.storage.repelList.get(playerId);

      repel.team.current = teamId;
    }

    /**
     * Update connections storage.
     */
    if (prevTeamId !== 0 && this.storage.playerMainConnectionList.has(playerId)) {
      const connectionId = this.storage.playerMainConnectionList.get(playerId);
      const prevTeamConnections = this.storage.connectionIdByTeam.get(prevTeamId);

      prevTeamConnections.delete(connectionId);

      if (prevTeamId >= SERVER_MIN_MOB_ID && prevTeamConnections.size === 0) {
        this.storage.connectionIdByTeam.delete(prevTeamId);
      }

      if (!this.storage.connectionIdByTeam.has(teamId)) {
        this.storage.connectionIdByTeam.set(teamId, new Set());
      }

      const curTeamConnections = this.storage.connectionIdByTeam.get(teamId);

      curTeamConnections.add(connectionId);

      if (this.storage.connectionList.has(connectionId)) {
        const connection = this.storage.connectionList.get(connectionId);

        connection.meta.teamId = teamId;
      }
    }
  }

  /**
   * Update players and fire projectiles.
   *
   * @param frame
   * @param frameFactor
   */
  onUpdatePlayers(frame: number, frameFactor: number): void {
    const now = Date.now();

    this.storage.playerList.forEach(player => {
      player.repel.current = false;

      /**
       * Update limits.
       */
      if (
        this.isUpdatePerSecondLimits === true &&
        this.storage.playerMainConnectionList.has(player.id.current)
      ) {
        const c = this.storage.connectionList.get(
          this.storage.playerMainConnectionList.get(player.id.current)
        );

        c.meta.limits.any =
          c.meta.limits.any < LIMITS_ANY_DECREASE_WEIGHT
            ? 0
            : c.meta.limits.any - LIMITS_ANY_DECREASE_WEIGHT;

        c.meta.limits.key =
          c.meta.limits.key < LIMITS_KEY_DECREASE_WEIGHT
            ? 0
            : c.meta.limits.key - LIMITS_KEY_DECREASE_WEIGHT;

        c.meta.limits.chat =
          c.meta.limits.chat < this.app.config.packetsLimit.chatLeak
            ? 0
            : c.meta.limits.chat - this.app.config.packetsLimit.chatLeak;

        c.meta.limits.respawn =
          c.meta.limits.respawn < LIMITS_RESPAWN_DECREASE_WEIGHT
            ? 0
            : c.meta.limits.respawn - LIMITS_RESPAWN_DECREASE_WEIGHT;

        c.meta.limits.spectate =
          c.meta.limits.spectate < LIMITS_SPECTATE_DECREASE_WEIGHT
            ? 0
            : c.meta.limits.spectate - LIMITS_SPECTATE_DECREASE_WEIGHT;

        c.meta.limits.su =
          c.meta.limits.su < LIMITS_SU_DECREASE_WEIGHT
            ? 0
            : c.meta.limits.su - LIMITS_SU_DECREASE_WEIGHT;

        c.meta.limits.debug =
          c.meta.limits.debug < LIMITS_DEBUG_DECREASE_WEIGHT
            ? 0
            : c.meta.limits.debug - LIMITS_DEBUG_DECREASE_WEIGHT;
      }

      if (
        this.isUpdatePerSecondLimits === true &&
        this.storage.playerBackupConnectionList.has(player.id.current)
      ) {
        const c = this.storage.connectionList.get(
          this.storage.playerBackupConnectionList.get(player.id.current)
        );

        c.meta.limits.any =
          c.meta.limits.any < LIMITS_ANY_DECREASE_WEIGHT
            ? 0
            : c.meta.limits.any - LIMITS_ANY_DECREASE_WEIGHT;

        c.meta.limits.key =
          c.meta.limits.key < LIMITS_KEY_DECREASE_WEIGHT
            ? 0
            : c.meta.limits.key - LIMITS_KEY_DECREASE_WEIGHT;
      }

      /**
       * Skip spectators.
       */
      if (player.alivestatus.current !== PLAYERS_ALIVE_STATUSES.ALIVE) {
        player.times.inactiveTotal += 17;

        return;
      }

      if (
        player.keystate.FIRE ||
        (player.keystate.SPECIAL && player.planetype.current === SHIPS_TYPES.TORNADO)
      ) {
        player.planestate.fire = true;
      } else {
        player.planestate.fire = false;
      }

      /**
       * Update last moving time.
       */
      if (
        !(
          Math.abs(player.velocity.x) <= PLAYERS_INACTIVITY_VELOCITY_COORD_VALUE &&
          Math.abs(player.velocity.y) <= PLAYERS_INACTIVITY_VELOCITY_COORD_VALUE
        ) ||
        player.keystate.LEFT ||
        player.keystate.RIGHT ||
        player.keystate.UP ||
        player.keystate.DOWN ||
        player.planestate.fire ||
        player.keystate.ABILITY
      ) {
        // rounded tick time 16.6ms.
        player.times.activePlaying += 17;
        player.times.lastMove = now;

        if (player.team.current === CTF_TEAMS.RED) {
          player.times.activePlayingRed += 17;
        } else if (player.team.current === CTF_TEAMS.BLUE) {
          player.times.activePlayingBlue += 17;
        }
      } else {
        player.times.inactiveTotal += 17;
      }

      /**
       * Periodic PLAYER_UPDATE broadcast.
       */
      if (player.times.lastUpdatePacket < now - PLAYERS_BROADCAST_UPDATE_INTERVAL_MS) {
        player.delayed.BROADCAST_PLAYER_UPDATE = true;
      }

      /**
       * Shield expire check.
       */
      if (player.shield.current === true && player.shield.endTime <= now) {
        player.shield.current = false;
        player.delayed.BROADCAST_PLAYER_UPDATE = true;
      }

      /**
       * Inferno expire check.
       */
      if (player.inferno.current === true && player.inferno.endTime <= now) {
        player.inferno.current = false;
        player.delayed.BROADCAST_PLAYER_UPDATE = true;
      }

      const SHIP_SPECS = SHIPS_SPECS[player.planetype.current];
      let boostFactor = player.planestate.boost ? SHIP_SPECS.boostFactor : 1;

      player.energy.regen =
        SHIP_SPECS.energyRegen * UPGRADES_SPECS.ENERGY.factor[player.upgrades.energy];

      let energyDiff = player.energy.regen * frameFactor;
      let isUpdateHitbox = false;
      let isUpdateViewport = false;

      /**
       * Special handle.
       */
      if (player.planetype.current === SHIPS_TYPES.PREDATOR) {
        const isBoost =
          player.keystate.SPECIAL &&
          (player.keystate.UP || player.keystate.DOWN) &&
          player.energy.current >= Math.abs(SHIP_SPECS.specialEnergyRegen);

        /**
         * Boost state changed.
         */
        if (isBoost !== player.planestate.boost) {
          player.planestate.boost = isBoost;

          // Energy is out.
          if (!isBoost) {
            player.keystate.SPECIAL = false;
            boostFactor = 1;
          }

          player.delayed.BROADCAST_EVENT_BOOST = true;
        }

        if (isBoost) {
          player.energy.regen = SHIP_SPECS.specialEnergyRegen;
          energyDiff = SHIP_SPECS.specialEnergyRegen * frameFactor;
        }
      } else if (player.planetype.current === SHIPS_TYPES.GOLIATH) {
        /**
         * Repel handle.
         */
        player.planestate.repel =
          player.keystate.SPECIAL &&
          player.energy.current >= SHIP_SPECS.specialEnergy &&
          player.times.lastRepel < now - SHIP_SPECS.specialDelay;

        if (player.planestate.repel) {
          energyDiff = -SHIP_SPECS.specialEnergy;
          player.times.lastRepel = now;
        }
      } else if (player.planetype.current === SHIPS_TYPES.COPTER) {
        /**
         * Copter side moves.
         */
        player.planestate.strafe = player.keystate.SPECIAL;
      } else if (player.planetype.current === SHIPS_TYPES.PROWLER && player.keystate.SPECIAL) {
        /**
         * Prowler special.
         */
        if (player.planestate.stealthed) {
          player.planestate.stealthed = false;
          player.keystate.SPECIAL = false;
          player.delayed.BROADCAST_EVENT_STEALTH = true;
          player.delayed.BROADCAST_PLAYER_UPDATE = true;
          player.times.lastStealth = now;
        } else if (
          player.energy.current >= SHIP_SPECS.specialEnergy &&
          player.times.lastHit < now - SHIP_SPECS.specialDelay &&
          player.times.lastStealth < now - SHIP_SPECS.specialDelay
        ) {
          player.planestate.stealthed = true;
          energyDiff = -SHIP_SPECS.specialEnergy;
          player.times.lastStealth = now;
          player.delayed.BROADCAST_EVENT_STEALTH = true;
          player.keystate.SPECIAL = false;

          if (player.planestate.flagspeed === true) {
            this.emit(CTF_PLAYER_DROP_FLAG, player.id.current);
          }
        }
      }

      /**
       * Enegry update.
       */
      if (player.energy.current !== PLAYERS_ENERGY.MAX || energyDiff < 0) {
        player.energy.current += energyDiff;
      }

      if (player.energy.current > PLAYERS_ENERGY.MAX) {
        player.energy.current = PLAYERS_ENERGY.MAX;
        player.delayed.BROADCAST_PLAYER_UPDATE = true;
      }

      if (player.energy.current < PLAYERS_ENERGY.MIN) {
        player.energy.current = PLAYERS_ENERGY.MIN;
        player.delayed.BROADCAST_PLAYER_UPDATE = true;
      }

      /**
       * Health update.
       */
      if (player.health.current !== PLAYERS_HEALTH.MAX) {
        player.health.current += frameFactor * SHIP_SPECS.healthRegen;
      }

      if (player.health.current > PLAYERS_HEALTH.MAX) {
        player.health.current = PLAYERS_HEALTH.MAX;
        player.delayed.BROADCAST_PLAYER_UPDATE = true;
      }

      /**
       * Stun expiry check.
       */

      if (player.stunned.current === true && player.stunned.endTime <= now) {
        player.stunned.current = false;
        player.delayed.BROADCAST_PLAYER_UPDATE = true;
      }

      /**
       * Airplane movement direction.
       */

      let flightDirection = -999;

      if (player.stunned.current === false) {
        if (player.planestate.strafe) {
          /**
           * Copter strafe.
           */
          if (player.keystate.LEFT) {
            flightDirection = player.rotation.current - 0.5 * Math.PI;
          }

          if (player.keystate.RIGHT) {
            flightDirection = player.rotation.current + 0.5 * Math.PI;
          }
        } else if (player.keystate.LEFT || player.keystate.RIGHT) {
          isUpdateHitbox = true;

          if (player.keystate.LEFT) {
            player.rotation.current -= frameFactor * SHIP_SPECS.turnFactor;
          }

          if (player.keystate.RIGHT) {
            player.rotation.current += frameFactor * SHIP_SPECS.turnFactor;
          }

          player.rotation.current = ((player.rotation.current % PI_X2) + PI_X2) % PI_X2;
        }

        if (player.keystate.UP) {
          if (flightDirection === -999) {
            flightDirection = player.rotation.current;
          } else {
            flightDirection += Math.PI * (player.keystate.RIGHT ? -0.25 : 0.25);
          }
        } else if (player.keystate.DOWN) {
          if (flightDirection === -999) {
            flightDirection = player.rotation.current + Math.PI;
          } else {
            flightDirection += Math.PI * (player.keystate.RIGHT ? 0.25 : -0.25);
          }
        }
      }

      /**
       * Velocity update.
       */
      let velocityValue = 0;

      if (
        player.velocity.x !== 0 ||
        player.velocity.y !== 0 ||
        player.keystate.UP ||
        player.keystate.DOWN ||
        player.planestate.strafe
      ) {
        isUpdateHitbox = true;
        isUpdateViewport = true;

        const startSpeedX = player.velocity.x;
        const startSpeedY = player.velocity.y;

        if (flightDirection !== -999) {
          player.velocity.x +=
            Math.sin(flightDirection) * SHIP_SPECS.accelFactor * boostFactor * frameFactor;
          player.velocity.y -=
            Math.cos(flightDirection) * SHIP_SPECS.accelFactor * boostFactor * frameFactor;
        }

        velocityValue = Math.hypot(player.velocity.x, player.velocity.y);

        let maxVelocity =
          SHIP_SPECS.maxSpeed * boostFactor * UPGRADES_SPECS.SPEED.factor[player.upgrades.speed];

        if (player.inferno.current) {
          maxVelocity *= SHIP_SPECS.infernoFactor;
        }

        if (player.planestate.flagspeed) {
          maxVelocity = SHIP_SPECS.flagSpeed;
          player.captures.time += 17;
        }

        if (velocityValue > maxVelocity) {
          player.velocity.x *= maxVelocity / velocityValue;
          player.velocity.y *= maxVelocity / velocityValue;

          /**
           * Max velocity achieved.
           */
          if (!player.velocity.isMax) {
            player.velocity.isMax = true;
            player.velocity.isMin = false;
            player.delayed.BROADCAST_PLAYER_UPDATE = true;
          }
        } else if (
          player.velocity.x > SHIP_SPECS.minSpeed ||
          player.velocity.x < -SHIP_SPECS.minSpeed ||
          player.velocity.y > SHIP_SPECS.minSpeed ||
          player.velocity.y < -SHIP_SPECS.minSpeed
        ) {
          player.velocity.x *= 1 - SHIP_SPECS.brakeFactor * frameFactor;
          player.velocity.y *= 1 - SHIP_SPECS.brakeFactor * frameFactor;

          player.velocity.isMax = false;
          player.velocity.isMin = false;
        } else {
          player.velocity.x = 0;
          player.velocity.y = 0;

          /**
           * Min velocity achieved.
           */
          if (!player.velocity.isMin && (startSpeedX !== 0 || startSpeedY !== 0)) {
            player.velocity.isMin = true;
            player.velocity.isMax = false;
            player.delayed.BROADCAST_PLAYER_UPDATE = true;
          }
        }

        /**
         * Update player position.
         */
        player.position.x +=
          frameFactor * startSpeedX +
          0.5 * (player.velocity.x - startSpeedX) * frameFactor * frameFactor;
        player.position.y +=
          frameFactor * startSpeedY +
          0.5 * (player.velocity.y - startSpeedY) * frameFactor * frameFactor;
      }

      /**
       * Validate coords.
       */
      if (player.position.x < PLAYERS_POSITION.MIN_X) {
        player.position.x = PLAYERS_POSITION.MIN_X;
      }

      if (player.position.x > PLAYERS_POSITION.MAX_X) {
        player.position.x = PLAYERS_POSITION.MAX_X;
      }

      if (player.position.y < PLAYERS_POSITION.MIN_Y) {
        player.position.y = PLAYERS_POSITION.MIN_Y;
      }

      if (player.position.y > PLAYERS_POSITION.MAX_Y) {
        player.position.y = PLAYERS_POSITION.MAX_Y;
      }

      /**
       * Update hitbox.
       */
      if (isUpdateHitbox) {
        const hitboxCache = this.storage.shipHitboxesCache[player.planetype.current][
          player.rotation.low
        ];

        player.hitbox.x = ~~player.position.x + MAP_SIZE.HALF_WIDTH + hitboxCache.x;
        player.hitbox.y = ~~player.position.y + MAP_SIZE.HALF_HEIGHT + hitboxCache.y;

        player.hitbox.current.x = player.hitbox.x - hitboxCache.x;
        player.hitbox.current.y = player.hitbox.y - hitboxCache.y;

        if (
          player.hitbox.width !== hitboxCache.width ||
          player.hitbox.height !== hitboxCache.height
        ) {
          player.hitbox.width = hitboxCache.width;
          player.hitbox.height = hitboxCache.height;

          player.hitbox.current.setPoints([
            [hitboxCache.x, hitboxCache.y],
            [-hitboxCache.x, hitboxCache.y],
            [-hitboxCache.x, -hitboxCache.y],
            [hitboxCache.x, -hitboxCache.y],
          ]);
        }
      }

      /**
       * Update repel if active.
       */
      if (player.planetype.current === SHIPS_TYPES.GOLIATH && player.planestate.repel === true) {
        this.emit(PLAYERS_REPEL_UPDATE, player.id.current, player.position.x, player.position.y);
      }

      /**
       * Update viewport.
       */
      if (isUpdateViewport) {
        this.emit(
          VIEWPORTS_UPDATE_POSITION,
          player.id.current,
          ~~player.position.x,
          ~~player.position.y
        );
      }

      const useAbility = this.handleAbilities(player);

      /**
       * Fire projectiles.
       */
      if (player.planestate.fire === true) {
        const fireMode = player.inferno.current ? SHIPS_FIRE_MODES.INFERNO : SHIPS_FIRE_MODES.FIRE;
        let { fireEnergy } = SHIP_SPECS;
        let fireType = SHIPS_FIRE_TYPES.DEFAULT;
        let { missileType } = SHIP_SPECS;
        let FIRE_MODE_TEMPLATES = SHIP_SPECS[fireMode];

        if (player.keystate.SPECIAL) {
          fireType = SHIPS_FIRE_TYPES.SPECIAL;
          fireEnergy = SHIP_SPECS.specialEnergy;
          missileType = SHIP_SPECS.specialMissileType;
        } else if (useAbility) {
          const ABILITY_SPECS = ABILITIES_SPECS[player.ability.current];

          fireEnergy = ABILITY_SPECS.abilityEnergy;
          const specialMissileType = ABILITY_SPECS.missileType;

          if (specialMissileType) missileType = specialMissileType;

          if (ABILITY_SPECS.replaceFireTemplate) {
            FIRE_MODE_TEMPLATES = ABILITY_SPECS[fireMode];
          }
        }

        /**
         * Check fire energy.
         */
        if (
          player.energy.current >= fireEnergy &&
          player.times.lastFire < now - SHIP_SPECS.fireDelay
        ) {
          if (player.planestate.stealthed === true) {
            player.planestate.stealthed = false;
            player.times.lastStealth = now;
            player.delayed.BROADCAST_EVENT_STEALTH = true;
            this.delay(BROADCAST_PLAYER_UPDATE, player.id.current);
          }

          const FIRE_TEMPLATE = FIRE_MODE_TEMPLATES[fireType];
          const projectileIds = [];

          player.times.lastFire = now;

          player.energy.current -= fireEnergy;
          player.stats.fires += 1;
          player.stats.fireProjectiles += FIRE_TEMPLATE.length;

          /**
           * Angle between player velocity vector and player rotation vector.
           */
          const dirVelAngle =
            Math.atan2(player.rotation.cos, player.rotation.sin) -
            Math.atan2((-1 * player.velocity.y) / velocityValue, player.velocity.x / velocityValue);

          /**
           * Generate projectiles by fire template.
           */
          for (let index = 0; index < FIRE_TEMPLATE.length; index += 1) {
            const PROJECTILE_FIRE_TEMPLATE = FIRE_TEMPLATE[index];

            const PROJECTILE_SPECS = PROJECTILES_SPECS[missileType];
            const mobId = this.helpers.createMobId();
            const projectileRot =
              (((player.rotation.current + PROJECTILE_FIRE_TEMPLATE.rot) % PI_X2) + PI_X2) % PI_X2;

            const offsetSign =
              player.delayed.FIRE_ALTERNATE_MISSILE && !player.inferno.current ? -1 : 1;

            const projectileRotSin = Math.sin(projectileRot);
            const projectileRotCos = Math.cos(projectileRot);

            const upgradeFactor = UPGRADES_SPECS.MISSILE.factor[player.upgrades.missile];
            let { speedFactor } = PROJECTILE_SPECS;

            if (player.inferno.current === true) {
              speedFactor = PROJECTILE_SPECS.infernoSpeedFactor;
            }

            const accelX = projectileRotSin * PROJECTILE_SPECS.accel * upgradeFactor;
            const accelY = -projectileRotCos * PROJECTILE_SPECS.accel * upgradeFactor;

            let posX = player.position.x + PROJECTILE_FIRE_TEMPLATE.y * player.rotation.sin;
            let posY = player.position.y - PROJECTILE_FIRE_TEMPLATE.y * player.rotation.cos;

            if (PROJECTILE_FIRE_TEMPLATE.x !== 0) {
              posX += offsetSign * PROJECTILE_FIRE_TEMPLATE.x * player.rotation.cos;
              posY += offsetSign * PROJECTILE_FIRE_TEMPLATE.x * player.rotation.sin;
            }

            /**
             * Zero, if player fly in backward direction.
             */
            const dropVelocity = Math.abs(dirVelAngle) < Math.PI / 2 ? velocityValue : 0;

            const projectile = new Entity().attach(
              new Id(mobId),
              new MobType(missileType),
              new Position(posX, posY),
              new Velocity(
                projectileRotSin *
                  (dropVelocity + (PROJECTILE_SPECS.baseSpeed + speedFactor) * upgradeFactor),
                -projectileRotCos *
                  (dropVelocity + (PROJECTILE_SPECS.baseSpeed + speedFactor) * upgradeFactor),
                PROJECTILE_SPECS.maxSpeed * upgradeFactor
              ),
              new Acceleration(accelX, accelY),
              new Owner(player.id.current),
              new Team(player.team.current),
              new Rotation(projectileRot),
              new Distance(),
              new Delayed(),
              new Hitbox(),
              new HitCircles([...PROJECTILES_COLLISIONS[PROJECTILE_SPECS.shape]]),
              new Damage(PROJECTILE_SPECS.damage),
              new Repel(),
              new Inferno(player.inferno.current)
            );

            projectile.velocity.length =
              dropVelocity + (PROJECTILE_SPECS.baseSpeed + speedFactor) * upgradeFactor;

            this.storage.mobList.set(mobId, projectile);
            this.storage.projectileIdList.add(mobId);
            projectileIds.push(mobId);

            /**
             * Hitbox init.
             */
            const hitboxCache = this.storage.projectileHitboxesCache[PROJECTILE_SPECS.shape][
              projectile.rotation.low
            ];

            projectile.hitbox.width = hitboxCache.width;
            projectile.hitbox.height = hitboxCache.height;
            projectile.hitbox.x = ~~projectile.position.x + MAP_SIZE.HALF_WIDTH + hitboxCache.x;
            projectile.hitbox.y = ~~projectile.position.y + MAP_SIZE.HALF_HEIGHT + hitboxCache.y;

            // TL, TR, BR, BL.
            const hitbox = new Polygon(
              projectile.hitbox.x - hitboxCache.x,
              projectile.hitbox.y - hitboxCache.y,
              [
                [hitboxCache.x, hitboxCache.y],
                [-hitboxCache.x, hitboxCache.y],
                [-hitboxCache.x, -hitboxCache.y],
                [hitboxCache.x, -hitboxCache.y],
              ]
            );

            hitbox.id = projectile.id.current;
            hitbox.type = COLLISIONS_OBJECT_TYPES.PROJECTILE;
            projectile.hitbox.current = hitbox;

            this.emit(COLLISIONS_ADD_OBJECT, projectile.hitbox.current);

            /**
             * Copter alternate fire update.
             */
            if (PROJECTILE_FIRE_TEMPLATE.alt) {
              player.delayed.FIRE_ALTERNATE_MISSILE = !player.delayed.FIRE_ALTERNATE_MISSILE;
            }
          }

          /**
           * Add projectile to each player viewport, who will get the fire message.
           * Otherwise there will be phantom projectiles.
           */
          this.storage.broadcast.get(player.id.current).forEach(connectionId => {
            if (!this.storage.connectionList.has(connectionId)) {
              return;
            }

            const connection = this.storage.connectionList.get(connectionId);
            const broadcastToPlayerId = connection.meta.playerId;

            for (let pid = 0; pid < projectileIds.length; pid += 1) {
              if (this.storage.viewportList.has(broadcastToPlayerId)) {
                this.storage.viewportList.get(broadcastToPlayerId).current.add(projectileIds[pid]);
              }
            }
          });

          this.delay(BROADCAST_PLAYER_FIRE, player.id.current, projectileIds);
        }
      }

      /**
       * Emit events.
       */
      if (player.delayed.BROADCAST_EVENT_BOOST) {
        this.delay(BROADCAST_EVENT_BOOST, player.id.current);
      }

      if (player.delayed.BROADCAST_PLAYER_UPDATE) {
        this.delay(BROADCAST_PLAYER_UPDATE, player.id.current);
      }

      if (player.delayed.BROADCAST_EVENT_STEALTH) {
        this.delay(BROADCAST_EVENT_STEALTH, player.id.current);
      }

      this.emitDelayed();
    });

    this.isUpdatePerSecondLimits = false;
  }

  protected handleAbilities(player: Entity): boolean {
    if (!player.ability.current) return false;

    const now = Date.now();
    const ABILITY_SPECS = ABILITIES_SPECS[player.ability.current];
    let useAbility = player.keystate.ABILITY;

    // check if ability was recharged
    if (player.ability.capacity === 0) {
      if (player.ability.fullDrainTime < now - ABILITY_SPECS.rechargeTime) {
        player.ability.capacity = ABILITY_SPECS.maxCapacity;
      } else {
        useAbility = false;

        // switch off persistent ability
        if (player.ability.enabled) {
          if (ABILITY_SPECS.onEnd) ABILITY_SPECS.onEnd(player, ABILITY_SPECS, now);

          player.ability.enabled = false;
        }
      }
    }

    if (player.keystate.ABILITY && player.ability.enabled) {
      // switch off persistent ability
      player.keystate.ABILITY = false;
      player.ability.enabled = false;

      if (ABILITY_SPECS.onEnd) ABILITY_SPECS.onEnd(player, ABILITY_SPECS, now);
    }

    if (player.ability.enabled) {
      // check of persistent ability conditions
      if (ABILITY_SPECS.checkPersistentAbilityConditions) {
        if (!ABILITY_SPECS.checkPersistentAbilityConditions(player, ABILITY_SPECS, now)) {
          if (ABILITY_SPECS.onEnd) ABILITY_SPECS.onEnd(player, ABILITY_SPECS, now);

          player.ability.enabled = false;
        }
      }
    }

    // handle charging attack
    if (ABILITY_SPECS.chargingFire && player.ability.capacity) {
      if (player.keystate.ABILITY) {
        // when key is pressed we charge attack
        player.ability.chargingFire += 1;
        useAbility = false;
      } else if (player.ability.chargingFire) useAbility = true;
    }

    // launch ability
    if (useAbility && !player.ability.enabled) {
      // check whether it can be launched

      if (
        player.ability.lastUse < now - ABILITY_SPECS.abilityDelay &&
        ABILITY_SPECS.checkLaunchConditions(player, ABILITY_SPECS, now)
      ) {
        player.ability.lastUse = now;

        // prepare for launch
        if (ABILITY_SPECS.fire) {
          player.planestate.fire = true;
        } else if (ABILITY_SPECS.special || ABILITY_SPECS.specialPersistent) {
          this.log.debug(`PLAYER LAUNCHED ABILITY... ${player.ability.capacity}`);

          player.energy.current -= ABILITY_SPECS.abilityEnergy;

          if (ABILITY_SPECS.specialPersistent) {
            player.keystate.ABILITY = false;
            player.ability.enabled = true;
          }
        }

        if (ABILITY_SPECS.onLaunch) ABILITY_SPECS.onLaunch(player, ABILITY_SPECS, now);
      } else {
        useAbility = false;
      }
    }

    // adjust capacity
    if (useAbility || player.ability.enabled) {
      if (player.ability.capacity - ABILITY_SPECS.capacityDrain <= 0) {
        player.ability.capacity = 0;
        player.ability.fullDrainTime = now;
      } else {
        player.ability.capacity -= ABILITY_SPECS.capacityDrain;
      }
    }

    return useAbility;
  }
}
