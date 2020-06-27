import Component from '../component';

export default class Horizon extends Component {
  public x: number;

  public y: number;

  public validX: number;

  public validY: number;

  constructor(x: number, y: number) {
    super();

    /**
     * Original player values.
     */
    this.x = x;
    this.y = y;
  }
}
