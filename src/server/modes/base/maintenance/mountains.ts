import { Circle } from 'collisions';
import { COLLISIONS_OBJECT_TYPES, MAP_SIZE, MOUNTAIN_OBJECTS } from '@/constants';
import { COLLISIONS_ADD_OBJECT, TIMELINE_BEFORE_GAME_START } from '@/events';
import HitCircles from '@/server/components/hit-circles';
import Hitbox from '@/server/components/hitbox';
import Id from '@/server/components/mob-id';
import Position from '@/server/components/position';
import Rotation from '@/server/components/rotation';
import Entity from '@/server/entity';
import { System } from '@/server/system';

export default class GameMountains extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [TIMELINE_BEFORE_GAME_START]: this.loadMountains,
    };
  }

  loadMountains(): void {
    MOUNTAIN_OBJECTS.forEach(([x, y, radius]) => {
      const mountain = new Entity().attach(
        new Id(this.helpers.createServiceMobId()),
        new Rotation(0),
        new Position(x, y),
        new Hitbox(),
        new HitCircles([[0, 0, radius]])
      );

      mountain.hitbox.x = x + MAP_SIZE.HALF_WIDTH - radius;
      mountain.hitbox.y = y + MAP_SIZE.HALF_HEIGHT - radius;
      mountain.hitbox.height = radius * 2;
      mountain.hitbox.width = radius * 2;

      const hitbox = new Circle(mountain.hitbox.x + radius, mountain.hitbox.y + radius, radius);

      hitbox.id = mountain.id.current;
      hitbox.type = COLLISIONS_OBJECT_TYPES.MOUNTAIN;
      mountain.hitbox.current = hitbox;

      this.emit(COLLISIONS_ADD_OBJECT, mountain.hitbox.current);

      this.storage.mobList.set(mountain.id.current, mountain);
    });

    this.log.debug(`Mountains loaded (${MOUNTAIN_OBJECTS.length}).`);
  }
}
