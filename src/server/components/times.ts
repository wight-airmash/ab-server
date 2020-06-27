import Component from '../component';

export default class Times extends Component {
  /**
   * Similar to connection.createdAt, but for the player entity.
   */
  public createdAt: number;

  /**
   * In FFA and BTR is equal to `createdAt`.
   *
   * In CTF may be lower than `createdAt`,
   * because it doesn't take into account short-term
   * connection breaks (CTF special recovering feature).
   */
  public joinedAt: number;

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

  public inactiveTotal = 0;

  /**
   * times active in ms.
   */
  public activePlaying = 0;

  public activePlayingRed = 0;

  public activePlayingBlue = 0;

  constructor() {
    super();

    const now = Date.now();

    this.createdAt = now;
    this.joinedAt = now;
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
