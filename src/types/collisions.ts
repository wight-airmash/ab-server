import { Body } from 'collisions';

declare module 'collisions' {
  interface Body {
    id: number;
    type: number;
  }

  interface Polygon {
    setPoints(points: number[][]): void;
  }
}

Body.prototype.id = null;
Body.prototype.type = null;
