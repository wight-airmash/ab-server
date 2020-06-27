import { ServerPackets, SERVER_PACKETS } from '@airbattle/protocol';
import { CONNECTIONS_SEND_PACKETS, RESPONSE_GAME_SPECTATE } from '../../events';
import { MainConnectionId, PlayerId } from '../../types';
import { System } from '../system';

export default class GameSpectateResponse extends System {
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
      CONNECTIONS_SEND_PACKETS,
      {
        c: SERVER_PACKETS.GAME_SPECTATE,
        id,
      } as ServerPackets.GameSpectate,
      connectionId
    );
  }
}
