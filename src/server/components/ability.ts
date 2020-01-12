import Component from '@/server/component';

export default class Ability extends Component {
  public current: number;

  public enabled: boolean;

  public capacity: number;

  public chargingFire: number;

  public fullDrainTime: number;

  public lastUse: number;

  constructor(ability = null) {
    super();
    this.current = ability;
    this.enabled = false;
    this.capacity = 0;
    this.lastUse = 0;
    this.fullDrainTime = 0;
    this.chargingFire = 0;
  }
}
