import GameServerBootstrap from '../core/bootstrap';
import FlagCommandHandler from './commands/flag';
import LagsCommandHandler from './commands/lags';
import PlayersCommandHandler from './commands/players';
import ProfileCommandHandler from './commands/profile';
import RespawnCommandHandler from './commands/respawn';
import ServerCommandHandler from './commands/server';
import SpectateCommandHandler from './commands/spectate';
import SpectatorsCommandHandler from './commands/spectators';
import SuperuserCommandHandler from './commands/su';
import UpgradeCommandHandler from './commands/upgrade';
import UpgradesCommandHandler from './commands/upgrades';
import WelcomeCommandHandler from './commands/welcome';
import Times from './components/times';
import Connections from './connections';
import AckMessageHandler from './controllers/ack';
import BackupMessageHandler from './controllers/backup';
import ChatMessageHandler from './controllers/chat';
import CommandMessageHandler from './controllers/command';
import HorizonMessageHandler from './controllers/horizon';
import KeyMessageHandler from './controllers/key';
import LocalpingMessageHandler from './controllers/localping';
import LoginMessageHandler from './controllers/login';
import PongMessageHandler from './controllers/pong';
import SayMessageHandler from './controllers/say';
import ScoredetailedMessageHandler from './controllers/scoredetailed';
import SyncMessageHandler from './controllers/sync';
import TeamchatMessageHandler from './controllers/teamchat';
import VotemuteMessageHandler from './controllers/votemute';
import WhisperMessageHandler from './controllers/whisper';
import Entity from './entity';
import BansGuard from './guards/bans';
import ChatGuard from './guards/chat';
import PacketsGuard from './guards/packets';
import GameChat from './maintenance/chat';
import GameClock from './maintenance/clock';
import GameCollisions from './maintenance/collisions';
import GameMetrics from './maintenance/metrics';
import GameMountains from './maintenance/mountains';
import GameMute from './maintenance/mute';
import GamePlayersBounce from './maintenance/players/bounce';
import GamePlayersConnect from './maintenance/players/connect';
import GamePlayersDisconnect from './maintenance/players/disconnect';
import GamePlayersHit from './maintenance/players/hit';
import GamePlayersKill from './maintenance/players/kill';
import GamePlayersPowerup from './maintenance/players/powerup';
import GamePlayersRepel from './maintenance/players/repel';
import GamePlayersRespawn from './maintenance/players/respawn';
import GamePlayersShipType from './maintenance/players/ship-type';
import GamePlayersUpdate from './maintenance/players/update';
import GameUpgrades from './maintenance/players/upgrades';
import GamePowerups from './maintenance/powerups';
import GameProjectiles from './maintenance/projectiles';
import GameRankings from './maintenance/rankings';
import GameSpectating from './maintenance/spectating';
import GameViewports from './maintenance/viewports';
import GameWarming from './maintenance/warming';
import PingPeriodic from './periodic/ping';
import PowerupsPeriodic from './periodic/powerups';
import ScoreBoardPeriodic from './periodic/score-board';
import UserStatsPeriodic from './periodic/user-stats/user-stats';
import AfkDisconnectResponse from './responses/afk-disconnect';
import AlreadyLoggedInResponse from './responses/already-logged-in';
import BackupResponse from './responses/backup';
import PlayerBanResponse from './responses/ban';
import ChatPublicBroadcast from './responses/broadcast/chat-public';
import ChatSayBroadcast from './responses/broadcast/chat-say';
import ChatServerPublicBroadcast from './responses/broadcast/chat-server-public';
import ChatServerTeamBroadcast from './responses/broadcast/chat-server-team';
import ChatServerWhisperBroadcast from './responses/broadcast/chat-server-whisper';
import ChatTeamBroadcast from './responses/broadcast/chat-team';
import ChatWhisperBroadcast from './responses/broadcast/chat-whisper';
import EventBoostBroadcast from './responses/broadcast/event-boost';
import EventBounceBroadcast from './responses/broadcast/event-bounce';
import EventRepelBroadcast from './responses/broadcast/event-repel';
import EventStealthBroadcast from './responses/broadcast/event-stealth';
import MobDespawnBroadcast from './responses/broadcast/mob-despawn';
import MobDespawnCoordsBroadcast from './responses/broadcast/mob-despawn-coords';
import MobUpdateBroadcast from './responses/broadcast/mob-update';
import MobUpdateStationaryBroadcast from './responses/broadcast/mob-update-stationary';
import PlayerFireBroadcast from './responses/broadcast/player-fire';
import PlayerFlagBroadcast from './responses/broadcast/player-flag';
import PlayerHitBroadcast from './responses/broadcast/player-hit';
import PlayerKillBroadcast from './responses/broadcast/player-kill';
import PlayerLeaveBroadcast from './responses/broadcast/player-leave';
import PlayerLevelBroadcast from './responses/broadcast/player-level';
import PlayerNewBroadcast from './responses/broadcast/player-new';
import PlayerRespawnBroadcast from './responses/broadcast/player-respawn';
import PlayerReteamBroadcast from './responses/broadcast/player-reteam';
import PlayerTypeBroadcast from './responses/broadcast/player-type';
import PlayerUpdateBroadcast from './responses/broadcast/player-update';
import ScoreBoardBroadcast from './responses/broadcast/score-board';
import ServerMessageBroadcast from './responses/broadcast/server-message';
import VotemutedResponse from './responses/chat-votemuted';
import VotemutePassedResponse from './responses/chat-votemutepassed';
import CommandReplyResponse from './responses/command-reply';
import EventLeaveHorizonResponse from './responses/event-leavehorizon';
import GameSpectateResponse from './responses/game-spectate';
import IncorrectProtocolResponse from './responses/incorrect-protocol';
import InvalidLoginResponse from './responses/invalid-login';
import KickPlayerResponse from './responses/kick';
import LoginResponse from './responses/login';
import NotEnoughUpgradesResponse from './responses/not-enough-upgrades';
import PingResultResponse from './responses/ping-result';
import PlayerPowerupResponse from './responses/player-powerup';
import PlayerUpgradeResponse from './responses/player-upgrade';
import PlayersLimitResponse from './responses/players-limit';
import RespawnInactivityRequiredResponse from './responses/respawn-inactivity-required';
import ScoreUpdateResponse from './responses/score-update';
import ServerMessageResponse from './responses/server-message';
import ServerPlayerConnectResponse from './responses/server-player-connect';
import SpectateInactivityRequiredResponse from './responses/spectate-inactivity-required';
import SpectateKillResponse from './responses/spectate-kill';
import PacketRouter from './router';
import { GameStorage } from './storage';
import LoginPublicKeyDownloader from './support/auth';
import MobIdStorageOptimizer from './support/mob-id-storage';
import Recovering from './support/recovering';
import { System } from './system';
import AckTimeoutHandler from './timeouts/ack';
import BackupTimeoutHandler from './timeouts/backup';
import LoginTimeoutHandler from './timeouts/login';
import PongTimeoutHandler from './timeouts/pong';

export default abstract class GameManifest {
  protected app: GameServerBootstrap;

  protected storage: GameStorage;

  protected systemsToLoad: typeof System[] = [];

  constructor({ app }) {
    this.app = app;
    this.storage = app.storage;

    this.systems = [
      // Encoding and decoding ws packets, routing messages.
      Connections,
      PacketRouter,

      // Guards.
      PacketsGuard,
      ChatGuard,

      // Message Controllers.
      AckMessageHandler,
      BackupMessageHandler,
      ChatMessageHandler,
      CommandMessageHandler,
      HorizonMessageHandler,
      KeyMessageHandler,
      LocalpingMessageHandler,
      LoginMessageHandler,
      PongMessageHandler,
      SayMessageHandler,
      ScoredetailedMessageHandler,
      SyncMessageHandler,
      TeamchatMessageHandler,
      VotemuteMessageHandler,
      WhisperMessageHandler,

      // Commands.
      FlagCommandHandler,
      LagsCommandHandler,
      PlayersCommandHandler,
      ProfileCommandHandler,
      RespawnCommandHandler,
      ServerCommandHandler,
      SpectateCommandHandler,
      SpectatorsCommandHandler,
      SuperuserCommandHandler,
      UpgradeCommandHandler,
      UpgradesCommandHandler,
      WelcomeCommandHandler,

      // Responses.
      AfkDisconnectResponse,
      AlreadyLoggedInResponse,
      BackupResponse,
      CommandReplyResponse,
      EventLeaveHorizonResponse,
      GameSpectateResponse,
      IncorrectProtocolResponse,
      InvalidLoginResponse,
      KickPlayerResponse,
      LoginResponse,
      NotEnoughUpgradesResponse,
      PingResultResponse,
      PlayerBanResponse,
      PlayerPowerupResponse,
      PlayersLimitResponse,
      PlayerUpgradeResponse,
      RespawnInactivityRequiredResponse,
      ScoreUpdateResponse,
      ServerMessageResponse,
      ServerPlayerConnectResponse,
      SpectateInactivityRequiredResponse,
      SpectateKillResponse,
      VotemutedResponse,
      VotemutePassedResponse,

      // Broadcast.
      ChatPublicBroadcast,
      ChatSayBroadcast,
      ChatServerPublicBroadcast,
      ChatServerTeamBroadcast,
      ChatServerWhisperBroadcast,
      ChatTeamBroadcast,
      ChatWhisperBroadcast,
      EventBoostBroadcast,
      EventBounceBroadcast,
      EventRepelBroadcast,
      EventStealthBroadcast,
      MobDespawnBroadcast,
      MobDespawnCoordsBroadcast,
      MobUpdateBroadcast,
      MobUpdateStationaryBroadcast,
      PlayerFireBroadcast,
      PlayerFlagBroadcast,
      PlayerHitBroadcast,
      PlayerKillBroadcast,
      PlayerLeaveBroadcast,
      PlayerLevelBroadcast,
      PlayerNewBroadcast,
      PlayerRespawnBroadcast,
      PlayerReteamBroadcast,
      PlayerTypeBroadcast,
      PlayerUpdateBroadcast,
      ScoreBoardBroadcast,
      ServerMessageBroadcast,

      // Timeouts.
      AckTimeoutHandler,
      BackupTimeoutHandler,
      LoginTimeoutHandler,
      PongTimeoutHandler,

      // Support.
      MobIdStorageOptimizer,
      BansGuard,
      Recovering,
      LoginPublicKeyDownloader,

      // Game Maintenance.
      GameWarming,
      GameClock,
      GameMetrics,
      GamePlayersUpdate,
      GamePlayersConnect,
      GamePlayersRespawn,
      GamePlayersDisconnect,
      GamePlayersHit,
      GamePlayersKill,
      GamePlayersPowerup,
      GamePlayersBounce,
      GamePlayersShipType,
      GameCollisions,
      GameProjectiles,
      GamePlayersRepel,
      GameMountains,
      GamePowerups,
      GameUpgrades,
      GameViewports,
      GameChat,
      GameMute,
      GameSpectating,
      GameRankings,

      // Periodic.
      PingPeriodic,
      PowerupsPeriodic,
      ScoreBoardPeriodic,
    ];

    if (this.app.config.accounts.active) {
      this.systems = [UserStatsPeriodic];
    }

    this.startSystems();

    this.app.storage.gameEntity = new Entity().attach(new Times());
  }

  startSystems(): void {
    this.systemsToLoad.forEach(S => {
      this.app.startSystem(new S({ app: this.app }));
    });

    this.systemsToLoad = [];
  }

  protected set systems(systems: typeof System | typeof System[]) {
    if (Array.isArray(systems)) {
      systems.forEach(s => {
        this.systemsToLoad.push(s);
      });
    } else {
      this.systemsToLoad.push(systems);
    }
  }
}
