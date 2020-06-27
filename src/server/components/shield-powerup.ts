import Component from '../component';

export default class Shield extends Component {
  public current: boolean;

  public endTime: number;

  public collected = 0;

  constructor(isActive = false, endTime = 0) {
    super();

    this.current = isActive;
    this.endTime = endTime;
  }
}
