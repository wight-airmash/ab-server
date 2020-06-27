import { BTR_FIREWALL_STATUS } from '@airbattle/protocol';
import Component from '../../component';

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

  public winnerKills: number;

  public firewall: {
    status: BTR_FIREWALL_STATUS;
    radius: number;
    posX: number;
    posY: number;
    speed: number;
  };

  public shipType: number;

  public playersAlive = 0;

  constructor() {
    super();

    this.winnerTeam = 0;
    this.bounty = 0;
  }
}
