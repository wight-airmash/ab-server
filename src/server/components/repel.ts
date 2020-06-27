import Component from '../component';

export default class Repel extends Component {
  /**
   * Is entity be repeled at current tick.
   */
  public current = false;

  public total = 0;

  constructor() {
    super();
  }
}
