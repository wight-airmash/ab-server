import Component from '@/server/component';

export default class Upgrades extends Component {
  public amount: number;

  public speed = 0;

  public defense = 0;

  public energy = 0;

  public missile = 0;

  constructor(amount = 0) {
    super();

    this.amount = amount;
  }
}
