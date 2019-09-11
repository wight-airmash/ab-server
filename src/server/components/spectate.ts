import Component from '@/server/component';

export default class Spectate extends Component {
  public isActive = false;

  public current = 0;

  public last = 0;

  constructor() {
    super();
  }
}
