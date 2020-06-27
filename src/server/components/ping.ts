import Component from '../component';

export default class Ping extends Component {
  public current: number;

  public num: number;

  public clock: number;

  constructor(ping = 0) {
    super();

    this.current = ping;
    this.num = null;
    this.clock = null;
  }
}
