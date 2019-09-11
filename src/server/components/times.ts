import Component from '@/server/component';

export default class Times extends Component {
  public lastMove: number;

  public lastUpdatePacket: number;

  public lastHit: number;

  public lastDeath = 0;

  public lastFire: number;

  public lastStealth: number;

  public lastRepel: number;

  public updateClock: number;

  public sendPlayerUpdate: boolean;

  public unmuteTime = 0;

  public lastSwitch = 0;

  public lastBounce = 0;

  /**
   * ms.
   */
  public activePlaying = 0;

  constructor() {
    super();

    const now = Date.now();

    this.lastHit = 0;
    this.updateClock = 0;
    this.lastStealth = 0;
    this.lastRepel = 0;
    this.lastMove = now;
    this.lastUpdatePacket = now;
    this.sendPlayerUpdate = false;
    this.lastFire = 0;
  }
}
