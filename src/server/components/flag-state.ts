import Component from '@/server/component';

export default class FlagState extends Component {
  public captured = false;

  public returned = true;

  public lastReturn = 0;

  constructor() {
    super();
  }
}
