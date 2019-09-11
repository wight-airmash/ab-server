import Component from '@/server/component';

export default class Kills extends Component {
  public current: number;

  public total = 0;

  public carriers = 0;

  constructor(kills = 0) {
    super();

    this.current = kills;
  }
}
