import { Circle, Polygon } from 'collisions';
import { CTF_TEAMS, CTF_CAPTURE_BOUNTY } from '@airbattle/protocol';
import {
  TIMELINE_BEFORE_GAME_START,
  COLLISIONS_ADD_OBJECT,
  CTF_PLAYER_TOUCHED_FLAG,
  CTF_PLAYER_CROSSED_FLAGZONE,
  CTF_TEAM_CAPTURED_FLAG,
  CTF_CARRIER_KILLED,
  BROADCAST_GAME_FLAG,
  CTF_PLAYER_DROP_FLAG,
  BROADCAST_PLAYER_UPDATE,
  CTF_RESET_FLAGS,
  BROADCAST_FLAG_RETURNED,
  BROADCAST_FLAG_CAPTURED,
  BROADCAST_FLAG_TAKEN,
  RESPONSE_SCORE_UPDATE,
  PLAYERS_BEFORE_REMOVE,
  TIMELINE_CLOCK_MINUTE,
} from '@/events';
import { System } from '@/server/system';
import Entity from '@/server/entity';
import Id from '@/server/components/mob-id';
import Position from '@/server/components/position';
import {
  COLLISIONS_OBJECT_TYPES,
  MAP_SIZE,
  CTF_FLAGS_POSITIONS,
  CTF_FLAG_OWNER_INACTIVITY_TIMEOUT_MS,
  CTF_RETURNED_FLAG_INACTIVITY_TIMEOUT_MS,
  CTF_FLAGS_SPAWN_ZONE_COLLISIONS,
  CTF_FLAG_COLLISIONS,
  PLAYERS_ALIVE_STATUSES,
} from '@/constants';
import Owner from '@/server/components/owner';
import Team from '@/server/components/team';
import Hitbox from '@/server/components/hitbox';
import HitCircles from '@/server/components/hit-circles';
import Rotation from '@/server/components/rotation';
import FlagState from '@/server/components/flag-state';
import { PlayerId, MobId } from '@/types';
import { has } from '@/support/objects';

const [, , CTF_FLAG_RADUIS] = CTF_FLAG_COLLISIONS[0];

export default class GameFlags extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [TIMELINE_BEFORE_GAME_START]: this.initFlagElements,
      [TIMELINE_CLOCK_MINUTE]: this.checkFlagsState,
      [CTF_PLAYER_TOUCHED_FLAG]: this.onPlayerTouchedFlag,
      [CTF_PLAYER_CROSSED_FLAGZONE]: this.onPlayerCrossedDropZone,
      [CTF_PLAYER_DROP_FLAG]: this.onPlayerLostFlag,
      [CTF_CARRIER_KILLED]: this.onPlayerLostFlag,
      [CTF_RESET_FLAGS]: this.onResetFlags,
      [PLAYERS_BEFORE_REMOVE]: this.onPlayerDelete,
    };
  }

  initFlagElements(): void {
    /**
     * Blue capture zone.
     */
    {
      const [x, y, w, h] = CTF_FLAGS_SPAWN_ZONE_COLLISIONS[CTF_TEAMS.BLUE];

      const blueDropZone = new Entity().attach(
        new Id(this.helpers.createServiceMobId()),
        new Team(CTF_TEAMS.BLUE),
        new Position(x, y),
        new Hitbox()
      );

      blueDropZone.hitbox.x = x + MAP_SIZE.HALF_WIDTH - w / 2;
      blueDropZone.hitbox.y = y + MAP_SIZE.HALF_HEIGHT - h / 2;
      blueDropZone.hitbox.width = w;
      blueDropZone.hitbox.height = h;

      blueDropZone.hitbox.current = new Polygon(x + MAP_SIZE.HALF_WIDTH, y + MAP_SIZE.HALF_HEIGHT, [
        [-w / 2, -h / 2],
        [w / 2, -h / 2],
        [w / 2, h / 2],
        [-w / 2, h / 2],
      ]);

      blueDropZone.hitbox.current.id = blueDropZone.id.current;
      blueDropZone.hitbox.current.type = COLLISIONS_OBJECT_TYPES.FLAGZONE;

      this.emit(COLLISIONS_ADD_OBJECT, blueDropZone.hitbox.current);
      this.storage.mobList.set(blueDropZone.id.current, blueDropZone);

      this.log.debug('Blue drop zone added.');
    }

    /**
     * Blue flag.
     */
    {
      this.storage.ctfFlagBlueId = this.helpers.createServiceMobId();

      const [x, y] = CTF_FLAGS_POSITIONS[CTF_TEAMS.BLUE];

      const blueFlag = new Entity().attach(
        new Id(this.storage.ctfFlagBlueId),
        new Team(CTF_TEAMS.BLUE),
        new FlagState(),
        new Position(x, y),
        new Rotation(),
        new Owner(),
        new Hitbox(),
        new HitCircles([[0, 0, CTF_FLAG_RADUIS]])
      );

      blueFlag.hitbox.x = x + MAP_SIZE.HALF_WIDTH - CTF_FLAG_RADUIS;
      blueFlag.hitbox.y = y + MAP_SIZE.HALF_HEIGHT - CTF_FLAG_RADUIS;
      blueFlag.hitbox.height = CTF_FLAG_RADUIS * 2;
      blueFlag.hitbox.width = CTF_FLAG_RADUIS * 2;

      const hitbox = new Circle(
        blueFlag.hitbox.x + CTF_FLAG_RADUIS,
        blueFlag.hitbox.y + CTF_FLAG_RADUIS,
        CTF_FLAG_RADUIS
      );

      hitbox.id = blueFlag.id.current;
      hitbox.type = COLLISIONS_OBJECT_TYPES.FLAG;
      blueFlag.hitbox.current = hitbox;

      this.emit(COLLISIONS_ADD_OBJECT, blueFlag.hitbox.current);
      this.storage.mobList.set(this.storage.ctfFlagBlueId, blueFlag);

      this.log.debug('Blue flag added.');
    }

    /**
     * Red drop zone.
     */
    {
      const [x, y, w, h] = CTF_FLAGS_SPAWN_ZONE_COLLISIONS[CTF_TEAMS.RED];

      const redDropZone = new Entity().attach(
        new Id(this.helpers.createServiceMobId()),
        new Team(CTF_TEAMS.RED),
        new Position(x, y),
        new Hitbox()
      );

      redDropZone.hitbox.x = x + MAP_SIZE.HALF_WIDTH - w / 2;
      redDropZone.hitbox.y = y + MAP_SIZE.HALF_HEIGHT - h / 2;
      redDropZone.hitbox.width = w;
      redDropZone.hitbox.height = h;

      redDropZone.hitbox.current = new Polygon(x + MAP_SIZE.HALF_WIDTH, y + MAP_SIZE.HALF_HEIGHT, [
        [-w / 2, -h / 2],
        [w / 2, -h / 2],
        [w / 2, h / 2],
        [-w / 2, h / 2],
      ]);

      redDropZone.hitbox.current.id = redDropZone.id.current;
      redDropZone.hitbox.current.type = COLLISIONS_OBJECT_TYPES.FLAGZONE;

      this.emit(COLLISIONS_ADD_OBJECT, redDropZone.hitbox.current);
      this.storage.mobList.set(redDropZone.id.current, redDropZone);

      this.log.debug('Red drop zone added.');
    }

    /**
     * Red flag.
     */
    {
      this.storage.ctfFlagRedId = this.helpers.createServiceMobId();

      const [x, y] = CTF_FLAGS_POSITIONS[CTF_TEAMS.RED];

      const redFlag = new Entity().attach(
        new Id(this.storage.ctfFlagRedId),
        new Team(CTF_TEAMS.RED),
        new FlagState(),
        new Position(x, y),
        new Rotation(),
        new Owner(),
        new Hitbox(),
        new HitCircles([[0, 0, CTF_FLAG_RADUIS]])
      );

      redFlag.hitbox.x = x + MAP_SIZE.HALF_WIDTH - CTF_FLAG_RADUIS;
      redFlag.hitbox.y = y + MAP_SIZE.HALF_HEIGHT - CTF_FLAG_RADUIS;
      redFlag.hitbox.height = CTF_FLAG_RADUIS * 2;
      redFlag.hitbox.width = CTF_FLAG_RADUIS * 2;

      const hitbox = new Circle(
        redFlag.hitbox.x + CTF_FLAG_RADUIS,
        redFlag.hitbox.y + CTF_FLAG_RADUIS,
        CTF_FLAG_RADUIS
      );

      hitbox.id = redFlag.id.current;
      hitbox.type = COLLISIONS_OBJECT_TYPES.FLAG;
      redFlag.hitbox.current = hitbox;

      this.emit(COLLISIONS_ADD_OBJECT, redFlag.hitbox.current);
      this.storage.mobList.set(this.storage.ctfFlagRedId, redFlag);

      this.log.debug('Red flag added.');
    }
  }

  onPlayerTouchedFlag(playerId: PlayerId, flagId: MobId): void {
    if (this.storage.gameEntity.match.isActive === false) {
      return;
    }

    const flag = this.storage.mobList.get(flagId);

    if (flag.flagstate.captured !== true) {
      const player = this.storage.playerList.get(playerId);

      /**
       * Player might be killed at the same tick,
       * so check its status.
       */
      if (
        player.planestate.stealthed === true ||
        player.alivestatus.current !== PLAYERS_ALIVE_STATUSES.ALIVE
      ) {
        return;
      }

      if (player.team.current === flag.team.current) {
        if (flag.flagstate.returned === true) {
          return;
        }

        this.log.debug(
          `Player id${player.id.current} returned ${
            player.team.current === CTF_TEAMS.BLUE ? 'blue' : 'red'
          } flag.`
        );

        if (player.team.current === CTF_TEAMS.BLUE) {
          this.resetBlueFlag();
        } else {
          this.resetRedFlag();
        }

        player.recaptures.current += 1;

        this.emit(BROADCAST_FLAG_RETURNED, flag.team.current, player.name.current);
      } else {
        if (
          (flag.owner.previous === playerId &&
            flag.owner.lastDrop > Date.now() - CTF_FLAG_OWNER_INACTIVITY_TIMEOUT_MS) ||
          flag.flagstate.lastReturn > Date.now() - CTF_RETURNED_FLAG_INACTIVITY_TIMEOUT_MS
        ) {
          return;
        }

        this.log.debug(
          `Player id${player.id.current} took ${
            player.team.current === CTF_TEAMS.BLUE ? 'red' : 'blue'
          } flag.`
        );

        if (flag.flagstate.returned === false) {
          player.captures.saves += 1;
        }

        player.captures.attempts += 1;

        flag.owner.current = player.id.current;
        player.planestate.flagspeed = true;
        flag.flagstate.returned = false;
        flag.flagstate.captured = true;

        flag.hitbox.x = MAP_SIZE.WIDTH + 1000;
        flag.hitbox.y = MAP_SIZE.HEIGHT + 1000;
        flag.hitbox.current.x = flag.hitbox.x;
        flag.hitbox.current.y = flag.hitbox.y;

        this.emit(BROADCAST_PLAYER_UPDATE, player.id.current);
        this.emit(BROADCAST_FLAG_TAKEN, flag.team.current, player.name.current);
      }

      this.emit(BROADCAST_GAME_FLAG, flag.team.current);
    }
  }

  onPlayerCrossedDropZone(playerId: PlayerId, zoneId: MobId): void {
    if (this.storage.gameEntity.match.isActive === false) {
      return;
    }

    const player = this.storage.playerList.get(playerId);

    /**
     * Player might be killed at the same tick,
     * so check its status.
     */
    if (
      player.planestate.flagspeed === false ||
      player.alivestatus.current !== PLAYERS_ALIVE_STATUSES.ALIVE
    ) {
      return;
    }

    const zone = this.storage.mobList.get(zoneId);

    if (zone.team.current === player.team.current) {
      const flag = this.storage.mobList.get(
        player.team.current === CTF_TEAMS.BLUE
          ? this.storage.ctfFlagRedId
          : this.storage.ctfFlagBlueId
      );

      this.emit(CTF_TEAM_CAPTURED_FLAG, player.team.current);

      const bounty =
        CTF_CAPTURE_BOUNTY.BASE + CTF_CAPTURE_BOUNTY.INCREMENT * (this.storage.playerList.size - 1);

      const earnedScore = bounty > CTF_CAPTURE_BOUNTY.MAX ? CTF_CAPTURE_BOUNTY.MAX : bounty;

      player.score.current += earnedScore;

      if (flag.team.current === CTF_TEAMS.BLUE) {
        this.resetBlueFlag();
      } else {
        this.resetRedFlag();
      }

      player.planestate.flagspeed = false;
      player.captures.current += 1;

      if (has(player, 'user')) {
        const user = this.storage.userList.get(player.user.id);

        user.lifetimestats.earnings += earnedScore;
      }

      this.emit(BROADCAST_FLAG_CAPTURED, flag.team.current, player.name.current);

      /**
       * Update bounty player score.
       */
      this.emit(RESPONSE_SCORE_UPDATE, player.id.current);

      /**
       * Flush flagspeed.
       */
      this.emit(BROADCAST_PLAYER_UPDATE, player.id.current);

      /**
       * Broadcast flag reset to base.
       */
      this.emit(BROADCAST_GAME_FLAG, flag.team.current);

      /**
       * Broadcast match score update for player team.
       * (Required by frontend, can't be done
       * with single previous GAME_FLAG packet).
       */
      this.emit(BROADCAST_GAME_FLAG, player.team.current);

      this.log.debug(`Player id${player.id.current} captured the flag and gain ${bounty} bounty.`);
    }
  }

  onPlayerDelete(player: Entity): void {
    if (player.planestate.flagspeed === false) {
      return;
    }

    const flag = this.storage.mobList.get(
      player.team.current === CTF_TEAMS.BLUE
        ? this.storage.ctfFlagRedId
        : this.storage.ctfFlagBlueId
    );

    flag.owner.previous = player.id.current;
    flag.owner.current = 0;
    flag.owner.lastDrop = Date.now();
    flag.flagstate.returned = false;
    flag.flagstate.captured = false;

    /**
     * Update flag position and hitbox.
     */
    flag.position.x = player.position.x;
    flag.position.y = player.position.y;
    flag.hitbox.x = ~~flag.position.x + MAP_SIZE.HALF_WIDTH - CTF_FLAG_RADUIS;
    flag.hitbox.y = ~~flag.position.y + MAP_SIZE.HALF_HEIGHT - CTF_FLAG_RADUIS;
    flag.hitbox.height = CTF_FLAG_RADUIS * 2;
    flag.hitbox.width = CTF_FLAG_RADUIS * 2;
    flag.hitbox.current.x = flag.hitbox.x + CTF_FLAG_RADUIS;
    flag.hitbox.current.y = flag.hitbox.y + CTF_FLAG_RADUIS;

    this.emit(BROADCAST_GAME_FLAG, flag.team.current);

    this.log.debug(`Player id${player.id.current} disconnected with a flag.`);
  }

  /**
   * Player /drop the flag, was killed or disconnected.
   *
   * @param playerId
   */
  onPlayerLostFlag(playerId: PlayerId): void {
    const player = this.storage.playerList.get(playerId);
    let flag = null;

    if (this.helpers.isPlayerConnected(playerId)) {
      if (player.planestate.flagspeed === false) {
        return;
      }

      flag = this.storage.mobList.get(
        player.team.current === CTF_TEAMS.BLUE
          ? this.storage.ctfFlagRedId
          : this.storage.ctfFlagBlueId
      );

      player.planestate.flagspeed = false;
      flag.position.x = player.position.x;
      flag.position.y = player.position.y;
    } else {
      const redFlag = this.storage.mobList.get(this.storage.ctfFlagRedId);
      const blueFlag = this.storage.mobList.get(this.storage.ctfFlagBlueId);

      if (redFlag.owner.current === playerId) {
        flag = redFlag;
      } else if (blueFlag.owner.current === playerId) {
        flag = blueFlag;
      }
    }

    if (flag === null) {
      this.checkFlagsState();

      return;
    }

    flag.owner.previous = playerId;
    flag.owner.current = 0;
    flag.owner.lastDrop = Date.now();
    flag.flagstate.returned = false;
    flag.flagstate.captured = false;

    flag.hitbox.x = ~~flag.position.x + MAP_SIZE.HALF_WIDTH - CTF_FLAG_RADUIS;
    flag.hitbox.y = ~~flag.position.y + MAP_SIZE.HALF_HEIGHT - CTF_FLAG_RADUIS;
    flag.hitbox.height = CTF_FLAG_RADUIS * 2;
    flag.hitbox.width = CTF_FLAG_RADUIS * 2;

    flag.hitbox.current.x = flag.hitbox.x + CTF_FLAG_RADUIS;
    flag.hitbox.current.y = flag.hitbox.y + CTF_FLAG_RADUIS;

    this.emit(BROADCAST_GAME_FLAG, flag.team.current);
    this.emit(BROADCAST_PLAYER_UPDATE, playerId);

    this.log.debug(`Player id${playerId} lost or dropped the flag.`);
  }

  /**
   * Check for invalid flags state. Temporary solution.
   *
   * TODO: find the bug, when flag state updates with errors.
   */
  checkFlagsState(): void {
    const redFlag = this.storage.mobList.get(this.storage.ctfFlagRedId);
    const blueFlag = this.storage.mobList.get(this.storage.ctfFlagBlueId);

    if (redFlag.owner.current !== 0 && !this.helpers.isPlayerConnected(redFlag.owner.current)) {
      this.log.debug(`Red flag was cleared from previous owner id${redFlag.owner.current}.`);

      redFlag.owner.current = 0;
      redFlag.flagstate.captured = false;
      redFlag.owner.lastDrop = Date.now();

      this.emit(BROADCAST_GAME_FLAG, redFlag.team.current);
    }

    if (blueFlag.owner.current !== 0 && !this.helpers.isPlayerConnected(blueFlag.owner.current)) {
      this.log.debug(`Blue flag was cleared from previous owner id${blueFlag.owner.current}.`);

      blueFlag.owner.current = 0;
      blueFlag.flagstate.captured = false;
      blueFlag.owner.lastDrop = Date.now();

      this.emit(BROADCAST_GAME_FLAG, blueFlag.team.current);
    }
  }

  onResetFlags(): void {
    this.resetBlueFlag();
    this.resetRedFlag();
  }

  resetBlueFlag(): void {
    const flag = this.storage.mobList.get(this.storage.ctfFlagBlueId);
    const [x, y] = CTF_FLAGS_POSITIONS[CTF_TEAMS.BLUE];

    flag.position.x = x;
    flag.position.y = y;
    flag.owner.previous = 0;
    flag.owner.current = 0;
    flag.flagstate.returned = true;
    flag.flagstate.captured = false;
    flag.flagstate.lastReturn = Date.now();

    flag.hitbox.x = ~~flag.position.x + MAP_SIZE.HALF_WIDTH - CTF_FLAG_RADUIS;
    flag.hitbox.y = ~~flag.position.y + MAP_SIZE.HALF_HEIGHT - CTF_FLAG_RADUIS;
    flag.hitbox.height = CTF_FLAG_RADUIS * 2;
    flag.hitbox.width = CTF_FLAG_RADUIS * 2;

    flag.hitbox.current.x = flag.hitbox.x + CTF_FLAG_RADUIS;
    flag.hitbox.current.y = flag.hitbox.y + CTF_FLAG_RADUIS;

    this.log.debug('Blue flag was restored.', {
      owner: {
        previous: flag.owner.previous,
        current: flag.owner.current,
      },
      position: {
        x: flag.position.x,
        y: flag.position.y,
      },
      hitbox: {
        x: flag.hitbox.x,
        y: flag.hitbox.y,
      },
      collisions: {
        x: flag.hitbox.current.x,
        y: flag.hitbox.current.y,
      },
    });
  }

  resetRedFlag(): void {
    const flag = this.storage.mobList.get(this.storage.ctfFlagRedId);
    const [x, y] = CTF_FLAGS_POSITIONS[CTF_TEAMS.RED];

    flag.position.x = x;
    flag.position.y = y;
    flag.owner.previous = 0;
    flag.owner.current = 0;
    flag.flagstate.returned = true;
    flag.flagstate.captured = false;
    flag.flagstate.lastReturn = Date.now();

    flag.hitbox.x = ~~flag.position.x + MAP_SIZE.HALF_WIDTH - CTF_FLAG_RADUIS;
    flag.hitbox.y = ~~flag.position.y + MAP_SIZE.HALF_HEIGHT - CTF_FLAG_RADUIS;
    flag.hitbox.height = CTF_FLAG_RADUIS * 2;
    flag.hitbox.width = CTF_FLAG_RADUIS * 2;

    flag.hitbox.current.x = flag.hitbox.x + CTF_FLAG_RADUIS;
    flag.hitbox.current.y = flag.hitbox.y + CTF_FLAG_RADUIS;

    this.log.debug('Red flag was restored.', {
      owner: {
        previous: flag.owner.previous,
        current: flag.owner.current,
      },
      position: {
        x: flag.position.x,
        y: flag.position.y,
      },
      hitbox: {
        x: flag.hitbox.x,
        y: flag.hitbox.y,
      },
      collisions: {
        x: flag.hitbox.current.x,
        y: flag.hitbox.current.y,
      },
    });
  }
}
