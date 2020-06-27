import Component from '../component';

export default class PlaneState extends Component {
  public boost: boolean;

  public strafe: boolean;

  public repel: boolean;

  public fire: boolean;

  public stealthed: boolean;

  public flagspeed: boolean;

  constructor() {
    super();

    this.boost = false;
    this.strafe = false;
    this.repel = false;
    this.fire = false;
    this.stealthed = false;
    this.flagspeed = false;
  }
}
