import { ServerPackets, SERVER_PACKETS } from '@airbattle/protocol';
import { BROADCAST_EVENT_STEALTH, CONNECTIONS_SEND_PACKETS } from '../../../events';
import { PlayerId } from '../../../types';
import { System } from '../../system';

export default class EventStealthBroadcast extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [BROADCAST_EVENT_STEALTH]: this.onEventStealth,
    };
  }

  /**
   * Sent on:
   * 1. Player starts stealth.
   * 2. Player stops stealth after hit.
   * 3. Player stops stealth after repel.
   *
   * Broadcast to all players who "sees" the player.
   *
   * @param playerId
   */
  onEventStealth(playerId: PlayerId): void {
    if (!this.helpers.isPlayerConnected(playerId) || !this.storage.broadcast.has(playerId)) {
      return;
    }

    const player = this.storage.playerList.get(playerId);
    const recipients = [...this.storage.broadcast.get(playerId)];

    this.emit(
      CONNECTIONS_SEND_PACKETS,
      {
        c: SERVER_PACKETS.EVENT_STEALTH,
        id: playerId,
        state: player.planestate.stealthed,
        energy: player.energy.current,
        energyRegen: player.energy.regen,
      } as ServerPackets.EventStealth,
      recipients
    );

    player.delayed.BROADCAST_EVENT_STEALTH = false;
  }
}
