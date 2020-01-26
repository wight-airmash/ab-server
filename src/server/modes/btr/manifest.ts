import BaseGameManifest from '@/server/modes/base/mainfest';
import ServerCustomBroadcast from '@/server/modes/btr/responses/broadcast/server-custom';
import Match from '@/server/components/game/match';
import GameFirewallBroadcast from './responses/broadcast/game-firewall';
import GameMatches from './maintenance/matches';

export default class BTRGameManifest extends BaseGameManifest {
  constructor({ app }) {
    super({ app });

    this.systems = [
      // Broadcast.
      ServerCustomBroadcast,
      GameFirewallBroadcast,

      // Maintenance.
      GameMatches,
    ];

    this.startSystems();

    this.app.storage.gameEntity.attach(new Match());
    this.app.storage.gameEntity.match.isActive = false;
  }
}
