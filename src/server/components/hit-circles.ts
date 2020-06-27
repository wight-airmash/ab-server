import Component from '../component';

export default class HitCircles extends Component {
  public current: number[][];

  constructor(circles: number[][] = []) {
    super();

    this.current = circles;
  }
}
