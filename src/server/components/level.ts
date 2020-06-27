import Component from '../component';

export default class Level extends Component {
  public current: number;

  constructor(level: number) {
    super();

    this.current = level;
  }
}
