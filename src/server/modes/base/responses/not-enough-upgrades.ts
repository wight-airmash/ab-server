import { SERVER_ERRORS, SERVER_PACKETS, ServerPackets } from '@airbattle/protocol';
import { ERRORS_NOT_ENOUGH_UPGRADES, CONNECTIONS_SEND_PACKET } from '@/events';
import { System } from '@/server/system';
import { MainConnectionId } from '@/types';

export default class NotEnoughUpgrades extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [ERRORS_NOT_ENOUGH_UPGRADES]: this.onNotEnoughUpgrades,
    };
  }

  /**
   * Show an error message.
   *
   * @param connectionId
   */
  onNotEnoughUpgrades(connectionId: MainConnectionId): void {
    this.emit(
      CONNECTIONS_SEND_PACKET,
      {
        c: SERVER_PACKETS.ERROR,
        error: SERVER_ERRORS.NOT_ENOUGH_UPGRADES,
      } as ServerPackets.Error,
      connectionId
    );
  }
}
