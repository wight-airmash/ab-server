import Component from '@/server/component';
import { PlayerId } from '@/types';

export default class Deaths extends Component {
  public current: number;

  public withFlag = 0;

  /**
   * ID of the latest killer.
   * 0 - BTR firewall.
   */
  public killerId: PlayerId = null;

  constructor(deaths = 0) {
    super();

    this.current = deaths;
  }
}
