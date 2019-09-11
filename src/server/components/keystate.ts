import Component from '@/server/component';

export default class Keystate extends Component {
  public UP: boolean;

  public RIGHT: boolean;

  public DOWN: boolean;

  public LEFT: boolean;

  public FIRE: boolean;

  public SPECIAL: boolean;

  public STRAFE: boolean;

  public seq: number;

  constructor() {
    super();

    this.seq = -1;
    this.UP = false;
    this.RIGHT = false;
    this.DOWN = false;
    this.LEFT = false;
    this.FIRE = false;
    this.SPECIAL = false;
    this.STRAFE = false;
  }
}
