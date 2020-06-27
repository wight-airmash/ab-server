import Component from '../component';

export default class Name extends Component {
  public current: string;

  public original: string;

  constructor(name: string, original: string) {
    super();

    this.current = name;
    this.original = original;
  }
}
