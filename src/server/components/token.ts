import Component from '@/server/component';

export default class BackupToken extends Component {
  public current: string;

  constructor(token: string) {
    super();

    this.current = token;
  }
}
