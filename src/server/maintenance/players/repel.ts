import { Circle } from 'collisions';
import {
  COLLISIONS_OBJECT_TYPES,
  MAP_SIZE,
  PI_X2,
  PROJECTILES_SPECS,
  REPEL_COLLISIONS,
  REPEL_DOUBLE_DAMAGE_DISTANCE_ACTIVE,
  REPEL_DOUBLE_DAMAGE_RADIUS,
  REPEL_PLAYER_MAX_DISTANCE,
  REPEL_PLAYER_MIN_DISTANCE,
  REPEL_PROJECTILE_MAX_DISTANCE,
  REPEL_PROJECTILE_MIN_DISTANCE,
  SHIPS_SPECS,
} from '../../../constants';
import {
  BROADCAST_EVENT_STEALTH,
  BROADCAST_PLAYER_UPDATE,
  COLLISIONS_ADD_OBJECT,
  COLLISIONS_REMOVE_OBJECT,
  PLAYERS_REPEL_ADD,
  PLAYERS_REPEL_DELETE,
  PLAYERS_REPEL_MOBS,
  PLAYERS_REPEL_UPDATE,
} from '../../../events';
import { MobId, Player, PlayerId, Projectile, Repel } from '../../../types';
import HitCircles from '../../components/hit-circles';
import Hitbox from '../../components/hitbox';
import Id from '../../components/mob-id';
import Position from '../../components/position';
import Rotation from '../../components/rotation';
import Team from '../../components/team';
import Entity from '../../entity';
import { System } from '../../system';

export default class GamePlayersRepel extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [PLAYERS_REPEL_ADD]: this.onAddRepel,
      [PLAYERS_REPEL_DELETE]: this.onDeleteRepel,
      [PLAYERS_REPEL_MOBS]: this.onRepelMobs,
      [PLAYERS_REPEL_UPDATE]: this.onRepelUpdate,
    };
  }

  onAddRepel(player: Player): void {
    const radius = REPEL_COLLISIONS[0][2];
    const repel: Repel = new Entity().attach(
      new Hitbox(),
      new HitCircles([...REPEL_COLLISIONS]),
      new Id(player.id.current),
      new Position(player.position.x, player.position.y),
      new Rotation(),
      new Team(player.team.current)
    );

    repel.hitbox.x = ~~player.position.x + MAP_SIZE.HALF_WIDTH - radius;
    repel.hitbox.y = ~~player.position.y + MAP_SIZE.HALF_HEIGHT - radius;
    repel.hitbox.height = radius * 2;
    repel.hitbox.width = radius * 2;

    const hitbox = new Circle(repel.hitbox.x + radius, repel.hitbox.y + radius, radius);

    hitbox.id = repel.id.current;
    hitbox.type = COLLISIONS_OBJECT_TYPES.REPEL;
    hitbox.team = player.team.current;
    repel.hitbox.current = hitbox;

    this.emit(COLLISIONS_ADD_OBJECT, repel.hitbox.current);

    this.storage.repelList.set(player.id.current, repel);
  }

  onDeleteRepel(player: Player): void {
    if (!this.storage.repelList.has(player.id.current)) {
      return;
    }

    const repel = this.storage.repelList.get(player.id.current);

    this.emit(COLLISIONS_REMOVE_OBJECT, repel.hitbox.current);
    this.storage.repelList.delete(player.id.current);
  }

  onRepelUpdate(repelId: MobId, playerX: number, playerY: number): void {
    const radius = REPEL_COLLISIONS[0][2];
    const repel = this.storage.repelList.get(repelId);

    repel.position.x = playerX;
    repel.position.y = playerY;
    repel.hitbox.x = ~~playerX + MAP_SIZE.HALF_WIDTH - radius;
    repel.hitbox.y = ~~playerY + MAP_SIZE.HALF_HEIGHT - radius;

    repel.hitbox.current.x = repel.hitbox.x + radius;
    repel.hitbox.current.y = repel.hitbox.y + radius;
  }

  onRepelMobs(player: Player, players: PlayerId[], projectiles: MobId[]): void {
    const now = Date.now();

    /**
     * Repel players.
     */
    for (let index = 0; index < players.length; index += 1) {
      const victim = this.storage.playerList.get(players[index]);
      const distance = Math.hypot(
        victim.position.x - player.position.x,
        victim.position.y - player.position.y
      );
      const { maxSpeed, repelEnergy } = SHIPS_SPECS[victim.planetype.current];
      let repelFactor = 1;

      if (distance > REPEL_PLAYER_MAX_DISTANCE) {
        repelFactor = 0;
      } else if (distance <= REPEL_PLAYER_MIN_DISTANCE) {
        repelFactor = 1;
      } else {
        repelFactor = GamePlayersRepel.repelAirplaneEnergy(distance) / repelEnergy;

        if (repelFactor > 1) {
          repelFactor = 1;
        }
      }

      if (repelFactor === 0) {
        continue;
      }

      victim.repel.current = true;
      victim.delayed.BROADCAST_PLAYER_UPDATE = true;

      const diffX = victim.position.x - player.position.x;
      const diffY = victim.position.y - player.position.y;
      const angle = Math.atan2(diffY, diffX);
      const sin = Math.sin(angle);
      const cos = Math.cos(angle);
      const speed = maxSpeed * repelFactor;

      victim.velocity.x = speed * cos;
      victim.velocity.y = speed * sin;

      if (victim.planestate.stealthed) {
        victim.planestate.stealthed = false;
        victim.times.lastStealth = now;

        this.delay(BROADCAST_EVENT_STEALTH, victim.id.current);
        this.delay(BROADCAST_PLAYER_UPDATE, victim.id.current);
      }
    }

    /**
     * Repel projectiles.
     */
    for (let index = 0; index < projectiles.length; index += 1) {
      const projectile = this.storage.mobList.get(projectiles[index]) as Projectile;
      const distanceToRepel = Math.hypot(
        projectile.position.x - player.position.x,
        projectile.position.y - player.position.y
      );
      const { baseSpeed, repelEnergy, shape, distance } = PROJECTILES_SPECS[
        projectile.mobtype.current
      ];
      let repelFactor = 1;
      let doubleDamage = false;

      if (distanceToRepel > REPEL_PROJECTILE_MAX_DISTANCE) {
        repelFactor = 0;
      } else if (distanceToRepel <= REPEL_PROJECTILE_MIN_DISTANCE) {
        repelFactor = 1;

        if (distanceToRepel < REPEL_DOUBLE_DAMAGE_RADIUS) {
          doubleDamage = true;
        }
      } else {
        repelFactor = GamePlayersRepel.repelProjectileEnergy(distanceToRepel) / repelEnergy;
      }

      if (repelFactor === 0 || projectile.repel.total > 1) {
        continue;
      }

      projectile.repel.current = true;
      projectile.repel.total += 1;

      const diffX = projectile.position.x - player.position.x;
      const diffY = projectile.position.y - player.position.y;
      const angle = Math.atan2(diffY, diffX);
      const rot = (Math.atan2(diffY, diffX) + Math.PI / 2 + PI_X2) % PI_X2;
      const sin = Math.sin(angle);
      const cos = Math.cos(angle);
      const speed = baseSpeed * repelFactor;

      projectile.owner.current = player.id.current;
      projectile.team.current = player.team.current;

      projectile.velocity.x = speed * cos;
      projectile.velocity.y = speed * sin;

      const accelX = projectile.acceleration.x;
      const accelY = projectile.acceleration.y;
      const accelValue = Math.hypot(accelX, accelY);

      projectile.acceleration.x = accelValue * cos;
      projectile.acceleration.y = accelValue * sin;

      if (distance - projectile.distance.current < 200) {
        projectile.distance.current = distance - 200;
      }

      if (doubleDamage) {
        projectile.damage.double = true;
        projectile.damage.doubleEnd =
          projectile.distance.current + REPEL_DOUBLE_DAMAGE_DISTANCE_ACTIVE;
      }

      projectile.rotation.current = rot;

      const hitboxCache = this.storage.projectileHitboxesCache[shape][projectile.rotation.low];

      projectile.hitbox.x = ~~projectile.position.x + MAP_SIZE.HALF_WIDTH + hitboxCache.x;
      projectile.hitbox.y = ~~projectile.position.y + MAP_SIZE.HALF_HEIGHT + hitboxCache.y;
      projectile.hitbox.current.team = player.team.current;

      if (
        projectile.hitbox.width !== hitboxCache.width ||
        projectile.hitbox.height !== hitboxCache.height
      ) {
        projectile.hitbox.width = hitboxCache.width;
        projectile.hitbox.height = hitboxCache.height;

        projectile.hitbox.current.setPoints([
          [hitboxCache.x, hitboxCache.y],
          [-hitboxCache.x, hitboxCache.y],
          [-hitboxCache.x, -hitboxCache.y],
          [hitboxCache.x, -hitboxCache.y],
        ]);
      }
    }
  }

  private static repelAirplaneEnergy(distance: number): number {
    return 2.48 * distance * distance - 884 * distance + 80482;
  }

  private static repelProjectileEnergy(distance: number): number {
    return 0.0479 * distance * distance - 18.84 * distance + 2007;
  }
}
