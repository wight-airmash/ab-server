import Component from '../component';

export default class Position extends Component {
  public currentX: number;

  public currentY: number;

  public lowX: number;

  public lowY: number;

  public chunk = 0;

  constructor(x: number, y: number) {
    super();

    this.x = x;
    this.y = y;
  }

  public set x(value: number) {
    this.currentX = value;
    this.lowX = value / 128 + 128;
  }

  public get x(): number {
    return this.currentX;
  }

  public set y(value: number) {
    this.currentY = value;
    this.lowY = value / 128 + 128;
  }

  public get y(): number {
    return this.currentY;
  }
}
