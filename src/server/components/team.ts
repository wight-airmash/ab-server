import Component from '@/server/component';

export default class Team extends Component {
  public current: number;

  constructor(id: number) {
    super();

    this.current = id;
  }
}
