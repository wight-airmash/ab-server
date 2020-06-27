import Component from '../component';

export default class Rotation extends Component {
  public currentAngle: number;

  public sin: number;

  public cos: number;

  public low: number;

  constructor(rotation = 0) {
    super();

    this.current = rotation;
  }

  public set current(value: number) {
    this.currentAngle = value;
    this.low = ~~(value * 1000) / 1000;
    this.sin = Math.sin(value);
    this.cos = Math.cos(value);
  }

  public get current(): number {
    return this.currentAngle;
  }
}
