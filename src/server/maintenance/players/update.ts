import { CTF_TEAMS, FLAGS_ISO_TO_CODE } from '@airbattle/protocol';
import { Polygon } from 'collisions';
import {
  COLLISIONS_OBJECT_TYPES,
  CONNECTIONS_IDLE_TIMEOUT_MS,
  CONNECTIONS_LAGGING_DEFINE_VALUE_MS,
  CONNECTIONS_LAGS_CHECK_INTERVAL_TICKS,
  CONNECTIONS_LAG_PACKETS_TO_DISCONNECT,
  LIMITS_ANY_DECREASE_WEIGHT,
  LIMITS_DEBUG_DECREASE_WEIGHT,
  LIMITS_KEY_DECREASE_WEIGHT,
  LIMITS_RESPAWN_DECREASE_WEIGHT,
  LIMITS_SAY_DECREASE_WEIGHT,
  LIMITS_SPECTATE_DECREASE_WEIGHT,
  LIMITS_SU_DECREASE_WEIGHT,
  MAP_SIZE,
  MS_PER_SEC,
  PI_X2,
  PLAYERS_ALIVE_STATUSES,
  PLAYERS_BROADCAST_UPDATE_INTERVAL_MS,
  PLAYERS_ENERGY,
  PLAYERS_HEALTH,
  PLAYERS_INACTIVITY_VELOCITY_COORD_VALUE,
  PLAYERS_POSITION,
  PROJECTILES_COLLISIONS,
  PROJECTILES_SPECS,
  SECONDS_PER_MINUTE,
  SERVER_MIN_MOB_ID,
  SHIPS_FIRE_MODES,
  SHIPS_FIRE_TYPES,
  SHIPS_SPECS,
  SHIPS_TYPES,
  UPGRADES_SPECS,
} from '../../../constants';
import {
  BROADCAST_EVENT_BOOST,
  BROADCAST_EVENT_STEALTH,
  BROADCAST_PLAYER_FIRE,
  BROADCAST_PLAYER_FLAG,
  BROADCAST_PLAYER_UPDATE,
  COLLISIONS_ADD_OBJECT,
  CONNECTIONS_DISCONNECT_PLAYER,
  CTF_PLAYER_DROP_FLAG,
  ERRORS_AFK_DISCONNECT,
  PLAYERS_EMIT_CHANNEL_FLAG,
  PLAYERS_REPEL_UPDATE,
  PLAYERS_UPDATE,
  PLAYERS_UPDATE_FLAG,
  PLAYERS_UPDATE_TEAM,
  RESPONSE_COMMAND_REPLY,
  TIMELINE_CLOCK_SECOND,
  TIMELINE_LOOP_START,
  VIEWPORTS_UPDATE_POSITION,
} from '../../../events';
import { CHANNEL_UPDATE_PLAYER_FLAG } from '../../../events/channels';
import { has } from '../../../support/objects';
import { ConnectionId, Player, PlayerId, Projectile, TeamId } from '../../../types';
import Acceleration from '../../components/acceleration';
import Damage from '../../components/damage';
import Delayed from '../../components/delayed';
import Distance from '../../components/distance';
import HitCircles from '../../components/hit-circles';
import Hitbox from '../../components/hitbox';
import Inferno from '../../components/inferno-powerup';
import Id from '../../components/mob-id';
import MobType from '../../components/mob-type';
import Owner from '../../components/owner';
import Position from '../../components/position';
import Repel from '../../components/repel';
import Rotation from '../../components/rotation';
import Team from '../../components/team';
import Velocity from '../../components/velocity';
import Entity from '../../entity';
import { System } from '../../system';

export default class GamePlayersUpdate extends System {
  private readonly afkDisconnectMs: number;

  private now: number;

  private shouldUpdateLimits: boolean;

  private shouldCheckLags: boolean;

  private ticksToLagsCheck = CONNECTIONS_LAGS_CHECK_INTERVAL_TICKS;

  constructor({ app }) {
    super({ app });

    this.afkDisconnectMs =
      this.config.connections.afkDisconnectTimeout * SECONDS_PER_MINUTE * MS_PER_SEC;

    this.listeners = {
      // Channels.
      [PLAYERS_EMIT_CHANNEL_FLAG]: this.onEmitDelayedFlagUpdateEvents,

      // Events.
      [PLAYERS_UPDATE_FLAG]: this.onUpdatePlayerFlag,
      [PLAYERS_UPDATE_TEAM]: this.onUpdatePlayerTeam,
      [PLAYERS_UPDATE]: this.onUpdatePlayers,
      [TIMELINE_CLOCK_SECOND]: this.onSecond,
      [TIMELINE_LOOP_START]: this.onTick,
    };
  }

  /**
   * Emit delayed events.
   */
  onEmitDelayedFlagUpdateEvents(): void {
    this.channel(CHANNEL_UPDATE_PLAYER_FLAG).emitDelayed();
  }

  onTick(): void {
    this.ticksToLagsCheck -= 1;

    if (this.ticksToLagsCheck === 0) {
      this.shouldCheckLags = true;
      this.ticksToLagsCheck = CONNECTIONS_LAGS_CHECK_INTERVAL_TICKS;
    }
  }

  onSecond(): void {
    this.shouldUpdateLimits = true;
    this.ticksToLagsCheck = CONNECTIONS_LAGS_CHECK_INTERVAL_TICKS;
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
    player.hitbox.current.team = teamId;

    if (this.storage.repelList.has(playerId)) {
      const repel = this.storage.repelList.get(playerId);

      repel.team.current = teamId;
      repel.hitbox.current.team = teamId;
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

        connection.teamId = teamId;
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
    this.now = Date.now();

    const skippedFrames = Math.round(frameFactor);
    const lastFrameCompensationFactor = frameFactor - Math.floor(frameFactor) + 1;
    let compensationFactor = frameFactor / skippedFrames;

    const playersIterator = this.storage.playerList.values();
    let player: Player = playersIterator.next().value;

    while (player !== undefined) {
      let isConnected = true;

      /**
       * Update lagging status, limits and disconnect AFK players.
       */
      if (this.shouldCheckLags || this.shouldUpdateLimits) {
        isConnected = this.performConnectionsUpdate(player);
      }

      if (!isConnected) {
        player = playersIterator.next().value;

        continue;
      }

      for (let frameIndex = 1; frameIndex <= skippedFrames; frameIndex += 1) {
        compensationFactor = 1;

        if (frameIndex === skippedFrames) {
          compensationFactor = lastFrameCompensationFactor;
        }

        /**
         * Skip spectators and disconnected players.
         */
        if (player.alivestatus.current !== PLAYERS_ALIVE_STATUSES.ALIVE) {
          player.times.inactiveTotal += 17;

          continue;
        }

        player.repel.current = false;

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
            Math.abs(player.velocity.x) < PLAYERS_INACTIVITY_VELOCITY_COORD_VALUE &&
            Math.abs(player.velocity.y) < PLAYERS_INACTIVITY_VELOCITY_COORD_VALUE
          ) ||
          player.keystate.LEFT ||
          player.keystate.RIGHT ||
          player.keystate.UP ||
          player.keystate.DOWN ||
          player.planestate.fire
        ) {
          // rounded tick time 16.6ms.
          player.times.activePlaying += 17;
          player.times.lastMove = this.now;

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
        if (player.times.lastUpdatePacket < this.now - PLAYERS_BROADCAST_UPDATE_INTERVAL_MS) {
          player.delayed.BROADCAST_PLAYER_UPDATE = true;
        }

        /**
         * Shield expire check.
         */
        if (player.shield.current && player.shield.endTime <= this.now) {
          player.shield.current = false;
          player.delayed.BROADCAST_PLAYER_UPDATE = true;
        }

        /**
         * Inferno expire check.
         */
        if (player.inferno.current && player.inferno.endTime <= this.now) {
          player.inferno.current = false;
          player.delayed.BROADCAST_PLAYER_UPDATE = true;
        }

        const SHIP_SPECS = SHIPS_SPECS[player.planetype.current];
        let boostFactor = player.planestate.boost ? SHIP_SPECS.boostFactor : 1;

        player.energy.regen =
          SHIP_SPECS.energyRegen * UPGRADES_SPECS.ENERGY.factor[player.upgrades.energy];

        let energyDiff = player.energy.regen * compensationFactor;
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
            energyDiff = SHIP_SPECS.specialEnergyRegen * compensationFactor;
          }
        } else if (player.planetype.current === SHIPS_TYPES.GOLIATH) {
          /**
           * Repel handle.
           */
          player.planestate.repel =
            player.keystate.SPECIAL &&
            player.energy.current >= SHIP_SPECS.specialEnergy &&
            player.times.lastRepel < this.now - SHIP_SPECS.specialDelay;

          if (player.planestate.repel) {
            energyDiff = -SHIP_SPECS.specialEnergy;
            player.times.lastRepel = this.now;
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
            player.times.lastStealth = this.now;
          } else if (
            player.energy.current >= SHIP_SPECS.specialEnergy &&
            player.times.lastHit < this.now - SHIP_SPECS.specialDelay &&
            player.times.lastStealth < this.now - SHIP_SPECS.specialDelay
          ) {
            player.planestate.stealthed = true;
            energyDiff = -SHIP_SPECS.specialEnergy;
            player.times.lastStealth = this.now;
            player.delayed.BROADCAST_EVENT_STEALTH = true;
            player.keystate.SPECIAL = false;

            if (player.planestate.flagspeed) {
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
          player.health.regen = SHIP_SPECS.healthRegen;
          player.health.current += compensationFactor * SHIP_SPECS.healthRegen;
        }

        if (player.health.current > PLAYERS_HEALTH.MAX) {
          if (this.config.killAssists) {
            player.damage.takenTraking = [];
          }

          player.health.regen = 0;
          player.health.current = PLAYERS_HEALTH.MAX;
          player.delayed.BROADCAST_PLAYER_UPDATE = true;
        }

        /**
         * Airplane movement direction.
         */
        let isMoving = player.velocity.x !== 0 || player.velocity.y !== 0;
        let flightDirection = -999;

        if (player.planestate.strafe) {
          /**
           * Copter strafe.
           */
          if (player.keystate.LEFT) {
            isMoving = true;
            flightDirection = player.rotation.current - 0.5 * Math.PI;
          }

          if (player.keystate.RIGHT) {
            isMoving = true;
            flightDirection = player.rotation.current + 0.5 * Math.PI;
          }
        } else if (player.keystate.LEFT || player.keystate.RIGHT) {
          isUpdateHitbox = true;

          if (player.keystate.LEFT) {
            player.rotation.current -= compensationFactor * SHIP_SPECS.turnFactor;
          }

          if (player.keystate.RIGHT) {
            player.rotation.current += compensationFactor * SHIP_SPECS.turnFactor;
          }

          player.rotation.current = ((player.rotation.current % PI_X2) + PI_X2) % PI_X2;
        }

        if (player.keystate.UP) {
          isMoving = true;

          if (flightDirection === -999) {
            flightDirection = player.rotation.current;
          } else {
            flightDirection += Math.PI * (player.keystate.RIGHT ? -0.25 : 0.25);
          }
        } else if (player.keystate.DOWN) {
          isMoving = true;

          if (flightDirection === -999) {
            flightDirection = player.rotation.current + Math.PI;
          } else {
            flightDirection += Math.PI * (player.keystate.RIGHT ? 0.25 : -0.25);
          }
        }

        /**
         * Velocity update.
         */
        let velocityValue = 0;

        if (isMoving) {
          isUpdateHitbox = true;
          isUpdateViewport = true;

          const startSpeedX = player.velocity.x;
          const startSpeedY = player.velocity.y;

          if (flightDirection !== -999) {
            player.velocity.x +=
              Math.sin(flightDirection) * SHIP_SPECS.accelFactor * boostFactor * compensationFactor;
            player.velocity.y -=
              Math.cos(flightDirection) * SHIP_SPECS.accelFactor * boostFactor * compensationFactor;
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
            player.velocity.x *= 1 - SHIP_SPECS.brakeFactor * compensationFactor;
            player.velocity.y *= 1 - SHIP_SPECS.brakeFactor * compensationFactor;

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
            compensationFactor * startSpeedX +
            0.5 * (player.velocity.x - startSpeedX) * compensationFactor * compensationFactor;
          player.position.y +=
            compensationFactor * startSpeedY +
            0.5 * (player.velocity.y - startSpeedY) * compensationFactor * compensationFactor;
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
          const hitboxCache =
            this.storage.shipHitboxesCache[player.planetype.current][player.rotation.low];

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
        if (player.planetype.current === SHIPS_TYPES.GOLIATH && player.planestate.repel) {
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

        /**
         * Fire projectiles.
         */
        if (player.planestate.fire) {
          const fireMode = player.inferno.current
            ? SHIPS_FIRE_MODES.INFERNO
            : SHIPS_FIRE_MODES.FIRE;
          let { fireEnergy } = SHIP_SPECS;
          let fireType = SHIPS_FIRE_TYPES.DEFAULT;

          if (!player.keystate.FIRE) {
            fireType = SHIPS_FIRE_TYPES.SPECIAL;
            fireEnergy = SHIP_SPECS.specialEnergy;
          }

          /**
           * Check fire energy.
           */
          if (
            player.energy.current >= fireEnergy &&
            player.times.lastFire < this.now - SHIP_SPECS.fireDelay
          ) {
            if (player.planestate.stealthed) {
              player.planestate.stealthed = false;
              player.times.lastStealth = this.now;
              player.delayed.BROADCAST_EVENT_STEALTH = true;
              this.delay(BROADCAST_PLAYER_UPDATE, player.id.current);
            }

            const FIRE_TEMPLATE = SHIP_SPECS[fireMode][fireType];
            const projectileIds = [];

            player.times.lastFire = this.now;
            player.energy.current -= fireEnergy;
            player.stats.fires += 1;
            player.stats.fireProjectiles += FIRE_TEMPLATE.length;

            /**
             * Angle between player velocity vector and player rotation vector.
             */
            const dirVelAngle =
              Math.atan2(player.rotation.cos, player.rotation.sin) -
              Math.atan2(
                (-1 * player.velocity.y) / velocityValue,
                player.velocity.x / velocityValue
              );

            /**
             * Generate projectiles by fire template.
             */
            for (let index = 0; index < FIRE_TEMPLATE.length; index += 1) {
              const PROJECTILE_FIRE_TEMPLATE = FIRE_TEMPLATE[index];
              const PROJECTILE_SPECS = PROJECTILES_SPECS[PROJECTILE_FIRE_TEMPLATE.type];
              const mobId = this.helpers.createMobId();
              const projectileRot =
                (((player.rotation.current + PROJECTILE_FIRE_TEMPLATE.rot) % PI_X2) + PI_X2) %
                PI_X2;

              const offsetSign =
                player.delayed.FIRE_ALTERNATE_MISSILE && !player.inferno.current ? -1 : 1;

              const projectileRotSin = Math.sin(projectileRot);
              const projectileRotCos = Math.cos(projectileRot);

              const upgradeFactor = UPGRADES_SPECS.MISSILE.factor[player.upgrades.missile];
              let { speedFactor } = PROJECTILE_SPECS;

              if (player.inferno.current) {
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

              const projectile: Projectile = new Entity().attach(
                new Acceleration(accelX, accelY),
                new Damage(PROJECTILE_SPECS.damage),
                new Delayed(),
                new Distance(),
                new Hitbox(),
                new HitCircles([...PROJECTILES_COLLISIONS[PROJECTILE_SPECS.shape]]),
                new Id(mobId),
                new Inferno(player.inferno.current),
                new MobType(PROJECTILE_FIRE_TEMPLATE.type),
                new Owner(player.id.current),
                new Position(posX, posY),
                new Repel(),
                new Rotation(projectileRot),
                new Team(player.team.current),
                new Velocity(
                  projectileRotSin *
                    (dropVelocity + (PROJECTILE_SPECS.baseSpeed + speedFactor) * upgradeFactor),
                  -projectileRotCos *
                    (dropVelocity + (PROJECTILE_SPECS.baseSpeed + speedFactor) * upgradeFactor),
                  PROJECTILE_SPECS.maxSpeed * upgradeFactor
                )
              );

              projectile.velocity.length =
                dropVelocity + (PROJECTILE_SPECS.baseSpeed + speedFactor) * upgradeFactor;

              this.storage.mobList.set(mobId, projectile);
              this.storage.projectileIdList.add(mobId);
              projectileIds.push(mobId);

              /**
               * Hitbox init.
               */
              const hitboxCache =
                this.storage.projectileHitboxesCache[PROJECTILE_SPECS.shape][
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
              hitbox.isCollideWithViewport = true;
              hitbox.isCollideWithRepel = true;
              hitbox.isCollideWithPlayer = true;
              hitbox.isProjectile = true;
              hitbox.team = player.team.current;
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
            const broadcastIterator = this.storage.broadcast.get(player.id.current).values();
            let connectionId: ConnectionId = broadcastIterator.next().value;

            while (connectionId !== undefined) {
              if (!this.storage.connectionList.has(connectionId)) {
                connectionId = broadcastIterator.next().value;

                continue;
              }

              const connection = this.storage.connectionList.get(connectionId);
              const broadcastToPlayerId = connection.playerId;

              for (let pid = 0; pid < projectileIds.length; pid += 1) {
                if (this.storage.viewportList.has(broadcastToPlayerId)) {
                  this.storage.viewportList
                    .get(broadcastToPlayerId)
                    .current.add(projectileIds[pid]);
                }
              }

              connectionId = broadcastIterator.next().value;
            }

            this.delay(BROADCAST_PLAYER_FIRE, player.id.current, projectileIds);
          }
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

      player = playersIterator.next().value;
    }

    this.shouldUpdateLimits = false;
    this.shouldCheckLags = false;
  }

  /**
   *
   * @param player
   * @return is the player still connected
   */
  private performConnectionsUpdate(player: Player): boolean {
    const mainConnectionId = this.storage.playerMainConnectionList.get(player.id.current);

    if (!this.storage.connectionList.has(mainConnectionId)) {
      return false;
    }

    /**
     * Detect lagging.
     */
    const mainConnection = this.storage.connectionList.get(mainConnectionId);
    const backupConnectionId = this.storage.playerBackupConnectionList.get(player.id.current);
    const hasBackupConnection = this.storage.connectionList.has(backupConnectionId);
    const backupConnection = this.storage.connectionList.get(backupConnectionId);

    if (!mainConnection.isBot) {
      let lastPacketReceivedAt = mainConnection.lastPacketAt;

      if (hasBackupConnection && backupConnection.lastPacketAt > lastPacketReceivedAt) {
        lastPacketReceivedAt = backupConnection.lastPacketAt;
      }

      const lastReceivedPacketInterval = this.now - lastPacketReceivedAt;

      if (lastReceivedPacketInterval > CONNECTIONS_IDLE_TIMEOUT_MS) {
        this.emit(CONNECTIONS_DISCONNECT_PLAYER, player.id.current);

        return false;
      }

      if (
        !mainConnection.lagging.isActive &&
        lastReceivedPacketInterval > CONNECTIONS_LAGGING_DEFINE_VALUE_MS
      ) {
        mainConnection.lagging.isActive = true;
        mainConnection.lagging.lastAt = mainConnection.lastPacketAt;

        if (hasBackupConnection) {
          backupConnection.lagging.isActive = true;
          backupConnection.lagging.lastAt = backupConnection.lastPacketAt;
        }
      }
    }

    /**
     * Update limits.
     */
    if (this.shouldUpdateLimits) {
      /**
       * Disconnect if AFK timeout configured (non-zero) and player inactivity is past that limit
       */
      if (this.afkDisconnectMs > 0 && this.now - player.times.lastMove > this.afkDisconnectMs) {
        this.emit(ERRORS_AFK_DISCONNECT, mainConnectionId);

        return false;
      }

      let { packets } = mainConnection.lagging;

      {
        const { limits } = mainConnection;

        limits.any =
          limits.any < LIMITS_ANY_DECREASE_WEIGHT ? 0 : limits.any - LIMITS_ANY_DECREASE_WEIGHT;

        limits.key =
          limits.key < LIMITS_KEY_DECREASE_WEIGHT ? 0 : limits.key - LIMITS_KEY_DECREASE_WEIGHT;

        limits.chat =
          limits.chat < this.config.connections.packetLimits.chatLeak
            ? 0
            : limits.chat - this.config.connections.packetLimits.chatLeak;

        limits.say =
          limits.say < LIMITS_SAY_DECREASE_WEIGHT ? 0 : limits.say - LIMITS_SAY_DECREASE_WEIGHT;

        limits.respawn =
          limits.respawn < LIMITS_RESPAWN_DECREASE_WEIGHT
            ? 0
            : limits.respawn - LIMITS_RESPAWN_DECREASE_WEIGHT;

        limits.spectate =
          limits.spectate < LIMITS_SPECTATE_DECREASE_WEIGHT
            ? 0
            : limits.spectate - LIMITS_SPECTATE_DECREASE_WEIGHT;

        limits.su =
          limits.su < LIMITS_SU_DECREASE_WEIGHT ? 0 : limits.su - LIMITS_SU_DECREASE_WEIGHT;

        limits.debug =
          limits.debug < LIMITS_DEBUG_DECREASE_WEIGHT
            ? 0
            : limits.debug - LIMITS_DEBUG_DECREASE_WEIGHT;
      }

      if (hasBackupConnection) {
        const { limits } = backupConnection;

        packets += backupConnection.lagging.packets;

        limits.any =
          limits.any < LIMITS_ANY_DECREASE_WEIGHT ? 0 : limits.any - LIMITS_ANY_DECREASE_WEIGHT;

        limits.key =
          limits.key < LIMITS_KEY_DECREASE_WEIGHT ? 0 : limits.key - LIMITS_KEY_DECREASE_WEIGHT;
      }

      if (packets > CONNECTIONS_LAG_PACKETS_TO_DISCONNECT) {
        this.log.info('Disconnect player due to lag packets amount: %o', {
          playerId: player.id.current,
          packets,
        });

        /**
         * So that it doesn't look like a punishment for a bad connection,
         * just disconnect the player (no kick alert).
         */
        this.emit(CONNECTIONS_DISCONNECT_PLAYER, player.id.current);

        return false;
      }
    }

    return true;
  }
}
