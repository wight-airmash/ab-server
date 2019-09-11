import Component from '@/server/component';

export default class Deaths extends Component {
  public current: number;

  public total = 0;

  public withFlag = 0;

  constructor(deaths = 0) {
    super();

    this.current = deaths;
  }
}
