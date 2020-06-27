import Component from '../component';

export default class FlagState extends Component {
  public captured = false;

  public returned = true;

  public dropped = false;

  public lastReturn = 0;

  constructor() {
    super();
  }
}
