import PlayersCommandHandler from '../../server/commands/players';
import Match from '../../server/components/game/match';
import GameManifest from '../../server/mainfest';
import GameChat from '../../server/maintenance/chat';
import DropCommandHandler from './commands/drop';
import ElectionsCommandHandler from './commands/elections';
import MatchCommandHandler from './commands/match';
import CTFPlayersCommandHandler from './commands/players';
import SwitchCommandHandler from './commands/switch';
import UsurpCommandHandler from './commands/usurp';
import SpawnCampingGuard from './guards/spawn-camping';
import GameEndpointAPI from './maintenance/api';
import CTFGameChat from './maintenance/chat';
import GameFlags from './maintenance/flags';
import GameMatches from './maintenance/matches';
import GamePlayers from './maintenance/players';
import GamePlayersStats from './maintenance/players-stats';
import GameRankings from './maintenance/rankings';
import InfernosPeriodic from './periodic/infernos';
import ShieldsPeriodic from './periodic/shields';
import Elections from './qbots/elections';
import FlagDropFix from './qbots/flag-drop-fix';
import Leaders from './qbots/leaders';
import PhantomPlayerKick from './qbots/phantom-kick';
import Usurpation from './qbots/usurpation';
import FlagCapturedBroadcast from './responses/broadcast/flag-captured';
import FlagReturnedBroadcast from './responses/broadcast/flag-returned';
import FlagTakenBroadcast from './responses/broadcast/flag-taken';
import GameFlagBroadcast from './responses/broadcast/game-flag';
import ServerCustomBroadcast from './responses/broadcast/server-custom';
import ScoreDetailedResponse from './responses/score-detailed';

export default class CTFGameManifest extends GameManifest {
  constructor({ app }) {
    super({ app });

    const loadedSystems = [...this.app.systems];

    [GameChat, PlayersCommandHandler].forEach(systemToStop => {
      this.app.stopSystem(loadedSystems.find(system => system.constructor === systemToStop));
    });

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
      InfernosPeriodic,
      ShieldsPeriodic,

      // Maintenance.
      CTFGameChat,
      GameEndpointAPI,
      GameFlags,
      GameMatches,
      GamePlayers,
      GamePlayersStats,
      GameRankings,
    ];

    if (this.app.config.ctf.qBotsFeatures) {
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
