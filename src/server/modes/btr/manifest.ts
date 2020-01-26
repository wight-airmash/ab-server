import BaseGameManifest from '@/server/modes/base/mainfest';
import ServerCustomBroadcast from '@/server/modes/btr/responses/broadcast/server-custom';
import Match from '@/server/components/game/match';
import RespawnCommandHandler from '../base/commands/respawn';
import BTRRespawnCommandHandler from './maintenance/respawn';
import GameFirewallBroadcast from './responses/broadcast/game-firewall';
import GameMatches from './maintenance/matches';
import InfernosPeriodic from './periodic/infernos';

export default class BTRGameManifest extends BaseGameManifest {
  constructor({ app }) {
    super({ app });

    const RespawnCommandSystem = [...this.app.systems].find(
      system => system.constructor === RespawnCommandHandler
    );

    this.app.stopSystem(RespawnCommandSystem);

    this.systems = [
      // Broadcast.
      ServerCustomBroadcast,
      GameFirewallBroadcast,

      // Commands.
      BTRRespawnCommandHandler,

      // Periodic.
      InfernosPeriodic,

      // Maintenance.
      GameMatches,
    ];

    this.startSystems();

    this.app.storage.gameEntity.attach(new Match());
    this.app.storage.gameEntity.match.isActive = false;
  }
}
