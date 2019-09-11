import BaseGameManifest from '@/server/modes/base/mainfest';
import ServerCustomBroadcast from '@/server/modes/btr/responses/broadcast/server-custom';
import Match from '@/server/components/game/match';

export default class BTRGameManifest extends BaseGameManifest {
  constructor({ app }) {
    super({ app });

    this.systems = [
      // Broadcast.
      ServerCustomBroadcast,
    ];

    this.startSystems();

    this.app.storage.gameEntity.attach(new Match());
  }
}
