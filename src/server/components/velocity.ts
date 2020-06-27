import Component from '../component';

export default class Velocity extends Component {
  public x: number;

  public y: number;

  public max: number;

  public isMax = false;

  public isMin = true;

  public length = 0;

  constructor(x: number, y: number, max = 0) {
    super();

    this.x = x;
    this.y = y;
    this.max = max;
  }
}
