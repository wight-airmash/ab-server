import Component from '../component';

export default class Keystate extends Component {
  public UP: boolean;

  public RIGHT: boolean;

  public DOWN: boolean;

  public LEFT: boolean;

  public FIRE: boolean;

  public SPECIAL: boolean;

  public STRAFE: boolean;

  public seq: number;

  public presses = {
    total: 0,
    FIRE: 0,
    UP: 0,
    RIGHT: 0,
    DOWN: 0,
    LEFT: 0,
    SPECIAL: 0,
  };

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
