import Component from '../component';

export default class Bot extends Component {
  public current: boolean;

  constructor(isBot = false) {
    super();

    this.current = isBot;
  }
}
