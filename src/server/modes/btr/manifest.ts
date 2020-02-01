import { BTR_SHIPS_TYPES_ORDER } from '@/constants';
import Match from '@/server/components/game/match';
import RespawnCommandHandler from '@/server/modes/base/commands/respawn';
import BaseGameManifest from '@/server/modes/base/mainfest';
import BTRRespawnCommandHandler from '@/server/modes/btr/commands/respawn';
import GameMatches from '@/server/modes/btr/maintenance/matches';
import GamePlayers from '@/server/modes/btr/maintenance/players';
import GameFirewallBroadcast from '@/server/modes/btr/responses/broadcast/game-firewall';
import PlayersAliveBroadcast from '@/server/modes/btr/responses/broadcast/players-alive';
import ServerCustomBroadcast from '@/server/modes/btr/responses/broadcast/server-custom';
import ScoreDetailed from '@/server/modes/btr/responses/score-detailed';

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

      // Responses.
      ScoreDetailed,

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
