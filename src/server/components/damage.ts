import Component from '../component';

export default class Damage extends Component {
  public current: number;

  public bots = 0;

  public hits = 0;

  public hitsReceived = 0;

  public hitsToBots = 0;

  public hitsByBots = 0;

  public double = false;

  public doubleEnd = 0;

  constructor(damage = 0) {
    super();

    this.current = damage;
  }
}
