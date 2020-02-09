import Component from '@/server/component';

export default class Stats extends Component {
  public matchesTotal = 0;

  public matchesActivePlayed = 0;

  public flagDrops = 0;

  public fires = 0;

  public fireProjectiles = 0;

  public switches = 0;

  constructor() {
    super();
  }
}
