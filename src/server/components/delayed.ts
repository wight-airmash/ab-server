import Component from '../component';

export default class Delayed extends Component {
  public BROADCAST_PLAYER_UPDATE = false;

  public BROADCAST_EVENT_BOOST = false;

  public BROADCAST_EVENT_BOUNCE = false;

  public BROADCAST_EVENT_REPEL = false;

  public BROADCAST_EVENT_STEALTH = false;

  public FIRE_ALTERNATE_MISSILE = false;

  public RESPAWN = false;

  public RESPONSE_SCORE_UPDATE = false;

  constructor() {
    super();
  }
}
