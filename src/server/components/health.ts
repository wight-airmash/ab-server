import Component from '@/server/component';

export default class Health extends Component {
  public current: number;

  constructor(health = 1) {
    super();

    this.current = health;
  }
}
