import BaseGameManifest from '@/server/modes/base/mainfest';
import ServerCustomBroadcast from '@/server/modes/btr/responses/broadcast/server-custom';
import Match from '@/server/components/game/match';
import RespawnCommandHandler from '../base/commands/respawn';
import BTRRespawnCommandHandler from './maintenance/respawn';
import GameFirewallBroadcast from './responses/broadcast/game-firewall';
import GameMatches from './maintenance/matches';
import GamePlayers from './maintenance/players';
import PlayersAliveBroadcast from './responses/broadcast/players-alive';
import InfernosPeriodic from './periodic/infernos';
import { SHIPS_TYPES, BTR_SHIPS_TYPES_ORDER } from '@/constants';

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
      PlayersAliveBroadcast,

      // Commands.
      BTRRespawnCommandHandler,

      // Periodic.
      InfernosPeriodic,

      // Maintenance.
      GameMatches,
      GamePlayers,
    ];

    this.startSystems();

    this.app.storage.gameEntity.attach(new Match());

    this.app.storage.gameEntity.match.isActive = false;

    const [shipType] = BTR_SHIPS_TYPES_ORDER;

    this.app.storage.gameEntity.match.shipType = shipType;
  }
}
