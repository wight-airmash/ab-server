import Match from '@/server/components/game/match';
import BaseGameManifest from '@/server/modes/base/mainfest';
import GameChat from '@/server/modes/base/maintenance/chat';
import DropCommandHandler from '@/server/modes/ctf/commands/drop';
import ElectionsCommandHandler from '@/server/modes/ctf/commands/elections';
import MatchCommandHandler from '@/server/modes/ctf/commands/match';
import SwitchCommandHandler from '@/server/modes/ctf/commands/switch';
import SpawnCampingGuard from '@/server/modes/ctf/guards/spawn-camping';
import CTFGameChat from '@/server/modes/ctf/maintenance/chat';
import GameFlags from '@/server/modes/ctf/maintenance/flags';
import GameMatches from '@/server/modes/ctf/maintenance/matches';
import GamePlayers from '@/server/modes/ctf/maintenance/players';
import InfernosPeriodic from '@/server/modes/ctf/periodic/infernos';
import ShieldsPeriodic from '@/server/modes/ctf/periodic/shields';
import Elections from '@/server/modes/ctf/qbots/elections';
import PhantomPlayerKick from '@/server/modes/ctf/qbots/phantom-kick';
import FlagCapturedBroadcast from '@/server/modes/ctf/responses/broadcast/flag-captured';
import FlagReturnedBroadcast from '@/server/modes/ctf/responses/broadcast/flag-returned';
import FlagTakenBroadcast from '@/server/modes/ctf/responses/broadcast/flag-taken';
import GameFlagBroadcast from '@/server/modes/ctf/responses/broadcast/game-flag';
import ServerCustomBroadcast from '@/server/modes/ctf/responses/broadcast/server-custom';
import ScoreDetailed from '@/server/modes/ctf/responses/score-detailed';

export default class CTFGameManifest extends BaseGameManifest {
  constructor({ app }) {
    super({ app });

    const GameChatSystem = [...this.app.systems].find(system => system.constructor === GameChat);

    this.app.stopSystem(GameChatSystem);

    this.systems = [
      // Commands.
      DropCommandHandler,
      ElectionsCommandHandler,
      MatchCommandHandler,
      SwitchCommandHandler,

      // Guards.
      SpawnCampingGuard,

      // Responses.
      ScoreDetailed,

      // Broadcast.
      FlagCapturedBroadcast,
      FlagReturnedBroadcast,
      FlagTakenBroadcast,
      GameFlagBroadcast,
      ServerCustomBroadcast,

      // Periodic.
      InfernosPeriodic,
      ShieldsPeriodic,

      // Maintenance.
      CTFGameChat,
      GameFlags,
      GameMatches,
      GamePlayers,

      // Q-bots
      Elections,
      PhantomPlayerKick,
    ];

    this.startSystems();

    this.app.storage.gameEntity.attach(new Match());
    this.app.storage.gameEntity.match.isActive = false;
  }
}
