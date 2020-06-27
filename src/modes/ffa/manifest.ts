import Match from '../../server/components/game/match';
import GameManifest from '../../server/mainfest';
import GamePlayers from './maintenance/players';
import InfernosPeriodic from './periodic/infernos';
import ScoreDetailedResponse from './responses/score-detailed';

export default class FFAGameManifest extends GameManifest {
  constructor({ app }) {
    super({ app });

    this.systems = [
      // Maintenance.
      GamePlayers,

      // Responses.
      ScoreDetailedResponse,

      // Periodic.
      InfernosPeriodic,
    ];

    this.startSystems();

    this.app.storage.gameEntity.attach(new Match());
  }
}
