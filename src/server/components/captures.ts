import Component from '../component';

export default class Captures extends Component {
  public current: number;

  public saves = 0;

  public savesAfterDrop = 0;

  public savesAfterDeath = 0;

  public attempts = 0;

  public attemptsFromBase = 0;

  public attemptsFromBaseWithShield = 0;

  public time = 0;

  constructor(captures = 0) {
    super();

    this.current = captures;
  }
}
