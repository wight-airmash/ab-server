import BaseGameManifest from '@/server/modes/base/mainfest';
import GamePlayers from '@/server/modes/ctf/maintenance/players';
import InfernosPeriodic from '@/server/modes/ctf/periodic/infernos';
import ShieldsPeriodic from '@/server/modes/ctf/periodic/shields';
import ServerCustomBroadcast from '@/server/modes/ctf/responses/broadcast/server-custom';
import ScoreDetailed from '@/server/modes/ctf/responses/score-detailed';
import Match from '@/server/components/game/match';
import GameFlags from '@/server/modes/ctf/maintenance/flags';
import GameFlagBroadcast from '@/server/modes/ctf/responses/broadcast/game-flag';
import GameMatches from '@/server/modes/ctf/maintenance/matches';
import DropCommandHandler from '@/server/modes/ctf/commands/drop';
import FlagReturnedBroadcast from '@/server/modes/ctf/responses/broadcast/flag-returned';
import FlagTakenBroadcast from '@/server/modes/ctf/responses/broadcast/flag-taken';
import FlagCapturedBroadcast from '@/server/modes/ctf/responses/broadcast/flag-captured';
import SwitchCommandHandler from '@/server/modes/ctf/commands/switch';
import MatchCommandHandler from '@/server/modes/ctf/commands/match';

export default class CTFGameManifest extends BaseGameManifest {
  constructor({ app }) {
    super({ app });

    this.systems = [
      // Commands.
      DropCommandHandler,
      SwitchCommandHandler,
      MatchCommandHandler,

      // Responses.
      ScoreDetailed,

      // Broadcast.
      ServerCustomBroadcast,
      GameFlagBroadcast,
      FlagReturnedBroadcast,
      FlagCapturedBroadcast,
      FlagTakenBroadcast,

      // Periodic.
      ShieldsPeriodic,
      InfernosPeriodic,

      // Maintenance.
      GamePlayers,
      GameFlags,
      GameMatches,
    ];

    this.startSystems();

    this.app.storage.gameEntity.attach(new Match());
    this.app.storage.gameEntity.match.isActive = false;
  }
}
