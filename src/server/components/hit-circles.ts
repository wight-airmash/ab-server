import Component from '@/server/component';

export default class HitCircles extends Component {
  public current: number[][];

  constructor(circles: number[][] = []) {
    super();

    this.current = circles;
  }
}
