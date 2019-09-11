import Component from '@/server/component';

export default class MobType extends Component {
  public current: number;

  constructor(type: number) {
    super();

    this.current = type;
  }
}
