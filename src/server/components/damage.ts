import Component from '@/server/component';

export default class Damage extends Component {
  public current: number;

  public double = false;

  public doubleEnd = 0;

  constructor(damage = 0) {
    super();

    this.current = damage;
  }
}
