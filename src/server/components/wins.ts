import Component from '../component';

export default class Wins extends Component {
  public current: number;

  constructor(wins = 0) {
    super();

    this.current = wins;
  }
}
