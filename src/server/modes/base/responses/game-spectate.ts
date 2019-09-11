import { SERVER_PACKETS, ServerPackets } from '@airbattle/protocol';
import { RESPONSE_GAME_SPECTATE, CONNECTIONS_SEND_PACKET } from '@/events';
import { System } from '@/server/system';
import { PlayerId, MainConnectionId } from '@/types';

export default class GameSpectate extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [RESPONSE_GAME_SPECTATE]: this.onGameSpectate,
    };
  }

  /**
   * Sent on:
   * 1. Switch into spectator mode.
   * 2. Change observed player.
   *
   * @param connectionId
   * @param id observed player
   */
  onGameSpectate(connectionId: MainConnectionId, id: PlayerId): void {
    this.emit(
      CONNECTIONS_SEND_PACKET,
      {
        c: SERVER_PACKETS.GAME_SPECTATE,
        id,
      } as ServerPackets.GameSpectate,
      connectionId
    );
  }
}
