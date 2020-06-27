import Component from '../component';

export default class Kills extends Component {
  public current: number;

  public carriers = 0;

  public carriersBots = 0;

  public currentmatch = 0;

  public bots = 0;

  public totalWithInferno = 0;

  public botsWithInferno = 0;

  constructor(kills = 0) {
    super();

    this.current = kills;
  }
}
