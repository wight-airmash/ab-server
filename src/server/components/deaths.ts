import { PlayerId } from '../../types';
import Component from '../component';

export default class Deaths extends Component {
  public current: number;

  public withFlag = 0;

  public byBots = 0;

  public withFlagByBots = 0;

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
