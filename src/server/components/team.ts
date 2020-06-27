import Component from '../component';

export default class Team extends Component {
  public current: number;

  constructor(id: number) {
    super();

    this.current = id;
  }
}
