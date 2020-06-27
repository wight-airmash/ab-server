import Component from '../component';

export default class MobType extends Component {
  public current: number;

  constructor(type: number) {
    super();

    this.current = type;
  }
}
