import Component from '../component';

export default class Health extends Component {
  public current: number;

  public regen = 0;

  constructor(health = 1) {
    super();

    this.current = health;
  }
}
