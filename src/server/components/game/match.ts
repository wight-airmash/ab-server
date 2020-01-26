import Component from '@/server/component';

export default class Match extends Component {
  /**
   * Common to both CTF and BTR
   */
  public isActive = true;

  public bounty: number;

  public start: number;

  /**
   * CTF only
   */
  public winnerTeam: number;

  public blue = 0;

  public red = 0;

  public current = 1;

  /**
   * BTR only
   */
  public winnerName: string;

  public winnerFlag: number;

  public winnerKills: string;

  public firewall: {
    status;
    radius;
    posX;
    posY;
  };

  public shipType: number;

  public playersAlive: number;

  constructor() {
    super();

    this.winnerTeam = 0;
    this.bounty = 0;
  }
}
