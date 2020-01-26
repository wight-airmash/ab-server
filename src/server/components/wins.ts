import Component from '@/server/component';

export default class Wins extends Component {
  public current: number;

  constructor(wins = 0) {
    super();

    this.current = wins;
  }
}
