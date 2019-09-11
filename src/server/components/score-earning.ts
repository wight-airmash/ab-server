import Component from '@/server/component';

export default class EarningScore extends Component {
  public current: number;

  constructor(score = 0) {
    super();

    this.current = score;
  }
}
