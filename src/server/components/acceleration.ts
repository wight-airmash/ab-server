import Component from '../component';

export default class Acceleration extends Component {
  public x: number;

  public y: number;

  constructor(x: number, y: number) {
    super();

    this.x = x;
    this.y = y;
  }
}
