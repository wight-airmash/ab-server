import Component from '../component';

export default class AliveStatus extends Component {
  /**
   * 0 — alive, 1 — dead/spectate.
   */
  public current: number;

  /**
   * Player was killed (and didn't switch to spectate or change its state somehow).
   */
  public isLastStateKilled = false;

  constructor(status = 0) {
    super();

    this.current = status;
  }
}
