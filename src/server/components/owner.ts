import Component from '@/server/component';

export default class Owner extends Component {
  public current: number;

  public lastDrop: number;

  public previous: number;

  constructor(ownerId = 0) {
    super();

    this.current = ownerId;
    this.lastDrop = Date.now();
  }
}
