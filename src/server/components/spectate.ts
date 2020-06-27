import Component from '../component';

export default class Spectate extends Component {
  public isActive = false;

  public current = 0;

  public last = 0;

  constructor() {
    super();
  }
}
