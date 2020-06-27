import { ServerPackets, SERVER_ERRORS, SERVER_PACKETS } from '@airbattle/protocol';
import { CONNECTIONS_SEND_PACKETS, ERRORS_NOT_ENOUGH_UPGRADES } from '../../events';
import { MainConnectionId } from '../../types';
import { System } from '../system';

export default class NotEnoughUpgradesResponse extends System {
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
      CONNECTIONS_SEND_PACKETS,
      {
        c: SERVER_PACKETS.ERROR,
        error: SERVER_ERRORS.NOT_ENOUGH_UPGRADES,
      } as ServerPackets.Error,
      connectionId
    );
  }
}
