import Component from '@/server/component';

export default class PlaneType extends Component {
  public current: number;

  constructor(type: number) {
    super();

    this.current = type;
  }
}
