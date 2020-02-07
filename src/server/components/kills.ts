import Component from '@/server/component';

export default class Kills extends Component {
  public current: number;

  public carriers = 0;

  public carriersBots = 0;

  public currentmatch = 0;

  public bots = 0;

  public totalByInferno = 0;

  public botsByInferno = 0;

  constructor(kills = 0) {
    super();

    this.current = kills;
  }
}
