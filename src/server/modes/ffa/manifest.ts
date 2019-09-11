import BaseGameManifest from '@/server/modes/base/mainfest';
import GamePlayers from '@/server/modes/ffa/maintenance/players';
import ScoreDetailed from '@/server/modes/ffa/responses/score-detailed';
import InfernosPeriodic from '@/server/modes/ffa/periodic/infernos';
import Match from '@/server/components/game/match';

export default class FFAGameManifest extends BaseGameManifest {
  constructor({ app }) {
    super({ app });

    this.systems = [
      // Maintenance.
      GamePlayers,

      // Responses.
      ScoreDetailed,

      // Periodic.
      InfernosPeriodic,
    ];

    this.startSystems();

    this.app.storage.gameEntity.attach(new Match());
  }
}
