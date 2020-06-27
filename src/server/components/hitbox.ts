import Component from '../component';

export default class Hitbox<T> extends Component {
  public x = 0;

  public y = 0;

  public width = 0;

  public height = 0;

  public id = 0;

  public type = 0;

  public current: T;

  constructor() {
    super();
  }
}
