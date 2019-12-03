import Component from '@/server/component';

export default class User extends Component {
  public id: string;

  constructor(id: string) {
    super();

    this.id = id;
  }
}
