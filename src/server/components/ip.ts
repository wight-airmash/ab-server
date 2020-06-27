import { IPv4 } from '../../types';
import Component from '../component';

export default class Ip extends Component {
  public current: string;

  constructor(ip: IPv4) {
    super();

    this.current = ip;
  }
}
