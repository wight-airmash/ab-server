import Component from '@/server/component';

export default class Despawn extends Component {
  public time: number;

  public permanent = false;

  constructor(time = 0) {
    super();

    this.time = time;
  }
}
