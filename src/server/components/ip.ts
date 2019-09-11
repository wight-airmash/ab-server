import Component from '@/server/component';

export default class Ip extends Component {
  public current: string;

  constructor(ip: string) {
    super();

    this.current = ip;
  }
}
