import Component from '../component';

export default class Distance extends Component {
  public forward = 0;

  public backward = 0;

  public strafe = 0;

  constructor() {
    super();
  }

  public get current(): number {
    return this.forward;
  }

  public set current(value: number) {
    this.forward = value;
  }
}
