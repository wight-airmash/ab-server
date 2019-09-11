import Component from '@/server/component';

export default class Match extends Component {
  public winnerTeam: number;

  public winnerFlag: number;

  public winnerName: string;

  public winnerKills: string;

  public bounty: number;

  public start: number;

  public isActive = true;

  public blue = 0;

  public red = 0;

  public current = 1;

  constructor() {
    super();

    this.winnerTeam = 0;
    this.bounty = 0;
  }
}
