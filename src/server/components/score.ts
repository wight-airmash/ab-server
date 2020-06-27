import Component from '../component';

export default class Score extends Component {
  public current: number;

  constructor(score = 0) {
    super();

    this.current = score;
  }
}
