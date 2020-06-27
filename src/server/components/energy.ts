import Component from '../component';

export default class Energy extends Component {
  public current: number;

  public regen: number;

  constructor(energy = 1) {
    super();

    this.current = energy;
    this.regen = 0;
  }
}
