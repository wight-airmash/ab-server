import { Polygon } from 'collisions';
import {
  COLLISIONS_MAP_COORDS,
  COLLISIONS_OBJECT_TYPES,
  MAP_SIZE,
  SERVER_MAX_VIEWPORT_RATIO,
} from '../../constants';
import {
  BROADCAST_CHAT_SERVER_PUBLIC,
  COLLISIONS_ADD_OBJECT,
  COLLISIONS_REMOVE_OBJECT,
  PLAYERS_SET_NEW_HORIZON,
  PLAYERS_UPDATE_HORIZON,
  SERVER_UPDATE_SCALE_FACTOR,
  TIMELINE_BEFORE_GAME_START,
  TIMELINE_LOOP_TICK,
  VIEWPORTS_CREATE,
  VIEWPORTS_REMOVE,
  VIEWPORTS_UPDATE_HORIZON,
  VIEWPORTS_UPDATE_POSITION,
} from '../../events';
import { CHANNEL_UPDATE_HORIZON } from '../../events/channels';
import { MainConnectionId, Player, PlayerId, Viewport, Viewports } from '../../types';
import { System } from '../system';

export default class GameViewports extends System {
  private viewports: Viewports;

  private players: Map<PlayerId, Player>;

  private maxArea = 0;

  constructor({ app }) {
    super({ app });

    this.viewports = this.storage.viewportList;
    this.players = this.storage.playerList;

    this.listeners = {
      [VIEWPORTS_UPDATE_POSITION]: this.onUpdateViewportPosition,
      [VIEWPORTS_UPDATE_HORIZON]: this.onUpdateViewportHorizon,
      [VIEWPORTS_CREATE]: this.onCreateViewport,
      [VIEWPORTS_REMOVE]: this.onRemoveViewport,
      [SERVER_UPDATE_SCALE_FACTOR]: this.onUpdateServerScaleFactor,
      [PLAYERS_UPDATE_HORIZON]: this.onUpdatePlayerHorizon,
      [PLAYERS_SET_NEW_HORIZON]: this.onGetNewPlayerHorizon,
      [TIMELINE_LOOP_TICK]: this.onUpdatePlayerHorizons,
      [TIMELINE_BEFORE_GAME_START]: this.initServerScaleFactorLimit,
    };
  }

  onUpdatePlayerHorizons(): void {
    this.channel(CHANNEL_UPDATE_HORIZON).emitDelayed();
  }

  initServerScaleFactorLimit(): void {
    this.maxArea = (this.config.server.scaleFactor * this.config.server.scaleFactor) / 16;

    this.log.debug(`Init server scale factor: ${this.config.server.scaleFactor}`);
  }

  onUpdateServerScaleFactor(scaleFactorLimit: number): void {
    this.config.server.scaleFactor = scaleFactorLimit;
    this.maxArea = (scaleFactorLimit * scaleFactorLimit) / 16;

    const playersIterator = this.storage.playerList.values();
    let player: Player = playersIterator.next().value;

    while (player !== undefined) {
      this.emit(PLAYERS_UPDATE_HORIZON, player.id.current, player.horizon.x, player.horizon.y);

      player = playersIterator.next().value;
    }

    this.emit(
      BROADCAST_CHAT_SERVER_PUBLIC,
      `New server scale factor activated: ${scaleFactorLimit}.`
    );

    this.log.info('Server scale factor limit updated: %o', {
      scaleFactorLimit,
    });
  }

  onGetNewPlayerHorizon(playerId: PlayerId, horizonX: number, horizonY: number): void {
    if (!this.players.has(playerId)) {
      return;
    }

    const player = this.players.get(playerId);

    player.horizon.x = horizonX;
    player.horizon.y = horizonY;

    this.onUpdatePlayerHorizon(playerId, horizonX, horizonY);
  }

  onUpdatePlayerHorizon(playerId: PlayerId, horizonX: number, horizonY: number): void {
    const player = this.players.get(playerId);
    let x = horizonX;
    let y = horizonY;

    if (horizonX / horizonY > SERVER_MAX_VIEWPORT_RATIO) {
      x = horizonY * SERVER_MAX_VIEWPORT_RATIO;
    } else if (horizonY / horizonX > SERVER_MAX_VIEWPORT_RATIO) {
      y = horizonX * SERVER_MAX_VIEWPORT_RATIO;
    }

    const area = x * y;

    if (area > this.maxArea) {
      const factor = Math.sqrt(this.maxArea / area);

      x *= factor;
      y *= factor;
    }

    x = Math.round(x);
    y = Math.round(y);

    player.horizon.validX = x;
    player.horizon.validY = y;

    if (this.viewports.has(playerId)) {
      this.emit(VIEWPORTS_UPDATE_HORIZON, playerId, x, y);
    }
  }

  onCreateViewport(
    playerId: PlayerId,
    connectionId: MainConnectionId,
    x: number,
    y: number,
    horizonX: number,
    horizonY: number
  ): void {
    const viewport: Viewport = {
      id: playerId,
      connectionId,
      hitbox: null,
      subs: new Set(),
      current: new Set(),
      leaved: new Set(),
      horizonX,
      horizonY,
    };

    // TL, TR, BR, BL.
    viewport.hitbox = new Polygon(x + MAP_SIZE.HALF_WIDTH, y + MAP_SIZE.HALF_HEIGHT, [
      [-horizonX, -horizonY],
      [horizonX, -horizonY],
      [horizonX, horizonY],
      [-horizonX, horizonY],
    ]);
    viewport.hitbox.id = playerId;
    viewport.hitbox.type = COLLISIONS_OBJECT_TYPES.VIEWPORT;

    this.emit(COLLISIONS_ADD_OBJECT, viewport.hitbox);
    this.viewports.set(playerId, viewport);
  }

  onRemoveViewport(playerId: PlayerId): void {
    const viewport = this.viewports.get(playerId);

    this.emit(COLLISIONS_REMOVE_OBJECT, viewport.hitbox);
    this.viewports.delete(playerId);
  }

  onUpdateViewportHorizon(playerId: PlayerId, horizonX: number, horizonY: number): void {
    const viewport = this.viewports.get(playerId);

    viewport.horizonX = horizonX;
    viewport.horizonY = horizonY;

    viewport.hitbox.setPoints([
      [-horizonX, -horizonY],
      [horizonX, -horizonY],
      [horizonX, horizonY],
      [-horizonX, horizonY],
    ]);

    this.emit(COLLISIONS_REMOVE_OBJECT, viewport.hitbox);
    this.emit(COLLISIONS_ADD_OBJECT, viewport.hitbox);

    this.onUpdateViewportPosition(
      playerId,
      viewport.hitbox.x - MAP_SIZE.HALF_WIDTH,
      viewport.hitbox.y - MAP_SIZE.HALF_HEIGHT
    );
  }

  onUpdateViewportPosition(playerId: PlayerId, x: number, y: number): void {
    const viewport = this.viewports.get(playerId);

    viewport.hitbox.x = x + MAP_SIZE.HALF_WIDTH;
    viewport.hitbox.y = y + MAP_SIZE.HALF_HEIGHT;

    if (viewport.hitbox.x < COLLISIONS_MAP_COORDS.MIN_X + viewport.horizonX) {
      viewport.hitbox.x = COLLISIONS_MAP_COORDS.MIN_X + viewport.horizonX;
    }

    if (viewport.hitbox.y < COLLISIONS_MAP_COORDS.MIN_Y + viewport.horizonY) {
      viewport.hitbox.y = COLLISIONS_MAP_COORDS.MIN_Y + viewport.horizonY;
    }

    if (viewport.hitbox.x > COLLISIONS_MAP_COORDS.MAX_X - viewport.horizonX) {
      viewport.hitbox.x = COLLISIONS_MAP_COORDS.MAX_X - viewport.horizonX;
    }

    if (viewport.hitbox.y > COLLISIONS_MAP_COORDS.MAX_Y - viewport.horizonY) {
      viewport.hitbox.y = COLLISIONS_MAP_COORDS.MAX_Y - viewport.horizonY;
    }

    if (viewport.subs.size !== 0) {
      this.updateSubs(viewport, x, y);
    }
  }

  private updateSubs(viewport: Viewport, x: number, y: number): void {
    const owner = this.players.get(viewport.hitbox.id);
    const subsIterator = viewport.subs.values();
    let playerId: PlayerId = subsIterator.next().value;

    while (playerId !== undefined) {
      const player = this.players.get(playerId);

      if (
        owner.planestate.stealthed &&
        (!this.config.visibleTeamProwlers || owner.team.current !== player.team.current)
      ) {
        playerId = subsIterator.next().value;

        continue;
      }

      const subViewport = this.viewports.get(playerId);

      subViewport.hitbox.x = x + MAP_SIZE.HALF_WIDTH;
      subViewport.hitbox.y = y + MAP_SIZE.HALF_HEIGHT;

      if (subViewport.hitbox.x < COLLISIONS_MAP_COORDS.MIN_X + subViewport.horizonX) {
        subViewport.hitbox.x = COLLISIONS_MAP_COORDS.MIN_X + subViewport.horizonX;
      }

      if (subViewport.hitbox.y < COLLISIONS_MAP_COORDS.MIN_Y + subViewport.horizonY) {
        subViewport.hitbox.y = COLLISIONS_MAP_COORDS.MIN_Y + subViewport.horizonY;
      }

      if (subViewport.hitbox.x > COLLISIONS_MAP_COORDS.MAX_X - subViewport.horizonX) {
        subViewport.hitbox.x = COLLISIONS_MAP_COORDS.MAX_X - subViewport.horizonX;
      }

      if (subViewport.hitbox.y > COLLISIONS_MAP_COORDS.MAX_Y - subViewport.horizonY) {
        subViewport.hitbox.y = COLLISIONS_MAP_COORDS.MAX_Y - subViewport.horizonY;
      }

      playerId = subsIterator.next().value;
    }
  }
}
