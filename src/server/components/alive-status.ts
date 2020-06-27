import Component from '../component';

export default class AliveStatus extends Component {
  /**
   * 0 — alive, 1 — dead/spectate.
   */
  public current: number;

  constructor(status = 0) {
    super();

    this.current = status;
  }
}
