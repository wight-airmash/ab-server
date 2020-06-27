import Component from '../component';

export default class Say extends Component {
  public text: string;

  public createdAt: number;

  public resetTimeout: NodeJS.Timeout;

  constructor() {
    super();
  }
}
