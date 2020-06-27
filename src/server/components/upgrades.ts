import Component from '../component';

export default class Upgrades extends Component {
  public amount: number;

  /**
   * History value: collected for the whole game time.
   */
  public collected = 0;

  /**
   * History value: used for the whole game time.
   */
  public used = 0;

  public speed = 0;

  public defense = 0;

  public energy = 0;

  public missile = 0;

  constructor(amount = 0) {
    super();

    this.amount = amount;
  }
}
