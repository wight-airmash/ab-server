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

  /**
   * Damage taken in time. Damage value is the share from the full health: (0..1].
   *
   * [aggressorId, damage, aggressorId, damage...]
   */
  public takenTraking: number[] = [];

  constructor(damage = 0) {
    super();

    this.current = damage;
  }
}
