import Component from '@/server/component';

export default class Captures extends Component {
  public current: number;

  public saves = 0;

  public attempts = 0;

  constructor(captures = 0) {
    super();

    this.current = captures;
  }
}
