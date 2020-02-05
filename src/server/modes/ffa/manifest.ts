import Match from '@/server/components/game/match';
import BaseGameManifest from '@/server/modes/base/mainfest';
import GamePlayers from '@/server/modes/ffa/maintenance/players';
import InfernosPeriodic from '@/server/modes/ffa/periodic/infernos';
import ScoreDetailedResponse from '@/server/modes/ffa/responses/score-detailed';

export default class FFAGameManifest extends BaseGameManifest {
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
