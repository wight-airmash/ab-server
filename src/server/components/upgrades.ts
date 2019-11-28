import Component from '@/server/component';

export default class Upgrades extends Component {
  public amount: number;

  public speed: number;

  public defense: number;

  public energy: number;

  public missile: number;

  reset() {
    this.amount = 0;
    this.speed = 0;
    this.defense = 0;
    this.energy = 0;
    this.missile = 0;
  }

  constructor(amount = 0) {
    super();
    this.reset();
  }
}
