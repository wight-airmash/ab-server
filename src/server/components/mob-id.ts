import Component from '../component';

export default class Id extends Component {
  public current: number;

  constructor(id: number) {
    super();

    this.current = id;
  }
}
