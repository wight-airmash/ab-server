import Match from '@/server/components/game/match';
import PlayersCommandHandler from '@/server/modes/base/commands/players';
import BaseGameManifest from '@/server/modes/base/mainfest';
import GameChat from '@/server/modes/base/maintenance/chat';
import DropCommandHandler from '@/server/modes/ctf/commands/drop';
import ElectionsCommandHandler from '@/server/modes/ctf/commands/elections';
import MatchCommandHandler from '@/server/modes/ctf/commands/match';
import CTFPlayersCommandHandler from '@/server/modes/ctf/commands/players';
import SwitchCommandHandler from '@/server/modes/ctf/commands/switch';
import UsurpCommandHandler from '@/server/modes/ctf/commands/usurp';
import SpawnCampingGuard from '@/server/modes/ctf/guards/spawn-camping';
import CTFGameChat from '@/server/modes/ctf/maintenance/chat';
import GameFlags from '@/server/modes/ctf/maintenance/flags';
import GameMatches from '@/server/modes/ctf/maintenance/matches';
import GamePlayers from '@/server/modes/ctf/maintenance/players';
import GamePlayersStats from '@/server/modes/ctf/maintenance/players-stats';
import GameRankings from '@/server/modes/ctf/maintenance/rankings';
import InfernosPeriodic from '@/server/modes/ctf/periodic/infernos';
import ExtraStatsPeriodic from '@/server/modes/ctf/periodic/player-stats';
import ShieldsPeriodic from '@/server/modes/ctf/periodic/shields';
import Elections from '@/server/modes/ctf/qbots/elections';
import FlagDropFix from '@/server/modes/ctf/qbots/flag-drop-fix';
import Leaders from '@/server/modes/ctf/qbots/leaders';
import PhantomPlayerKick from '@/server/modes/ctf/qbots/phantom-kick';
import Usurpation from '@/server/modes/ctf/qbots/usurpation';
import FlagCapturedBroadcast from '@/server/modes/ctf/responses/broadcast/flag-captured';
import FlagReturnedBroadcast from '@/server/modes/ctf/responses/broadcast/flag-returned';
import FlagTakenBroadcast from '@/server/modes/ctf/responses/broadcast/flag-taken';
import GameFlagBroadcast from '@/server/modes/ctf/responses/broadcast/game-flag';
import ServerCustomBroadcast from '@/server/modes/ctf/responses/broadcast/server-custom';
import ScoreDetailedResponse from '@/server/modes/ctf/responses/score-detailed';

export default class CTFGameManifest extends BaseGameManifest {
  constructor({ app }) {
    super({ app });

    const loadedSystems = [...this.app.systems];
    const GameChatSystem = loadedSystems.find(system => system.constructor === GameChat);
    const PlayersCommandHandlerSystem = loadedSystems.find(
      system => system.constructor === PlayersCommandHandler
    );

    this.app.stopSystem(GameChatSystem);
    this.app.stopSystem(PlayersCommandHandlerSystem);

    this.systems = [
      // Commands.
      DropCommandHandler,
      MatchCommandHandler,
      CTFPlayersCommandHandler,
      SwitchCommandHandler,

      // Guards.
      SpawnCampingGuard,

      // Responses.
      ScoreDetailedResponse,

      // Broadcast.
      FlagCapturedBroadcast,
      FlagReturnedBroadcast,
      FlagTakenBroadcast,
      GameFlagBroadcast,
      ServerCustomBroadcast,

      // Periodic.
      ExtraStatsPeriodic,
      InfernosPeriodic,
      ShieldsPeriodic,

      // Maintenance.
      CTFGameChat,
      GameFlags,
      GameMatches,
      GamePlayers,
      GamePlayersStats,
      GameRankings,
    ];

    if (this.app.config.ctfQBotsFeatures === true) {
      this.systems = [
        // Commands.
        ElectionsCommandHandler,
        UsurpCommandHandler,

        // Q-bots.
        Elections,
        FlagDropFix,
        Leaders,
        PhantomPlayerKick,
        Usurpation,
      ];
    }

    this.startSystems();

    this.app.storage.gameEntity.attach(new Match());
    this.app.storage.gameEntity.match.current = 0;
    this.app.storage.gameEntity.match.isActive = false;
  }
}
