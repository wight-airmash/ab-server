import { encodeUpgrades, ServerPackets, SERVER_PACKETS } from '@airbattle/protocol';
import { PLAYERS_ALIVE_STATUSES, SHIPS_TYPES } from '@/constants';
import { CONNECTIONS_SEND_PACKET, RESPONSE_SERVER_PLAYER_CONNECT } from '@/events';
import { System } from '@/server/system';
import { MainConnectionId } from '@/types';

export default class ServerPlayerConnectResponse extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [RESPONSE_SERVER_PLAYER_CONNECT]: this.onServerPlayerConnectResponse,
    };
  }

  /**
   * "Connect" server bot for the player.
   * We need player's frontend to store info about it
   * to be able to show chat messages from the server.
   *
   * @param connectionId
   */
  onServerPlayerConnectResponse(connectionId: MainConnectionId): void {
    this.emit(
      CONNECTIONS_SEND_PACKET,
      {
        c: SERVER_PACKETS.PLAYER_NEW,
        id: this.storage.serverPlayerId,
        status: PLAYERS_ALIVE_STATUSES.DEAD,
        name: this.app.config.bot.name,
        type: SHIPS_TYPES.PREDATOR,
        team: this.storage.serverPlayerId,
        posX: 0,
        posY: 0,
        rot: 0,
        flag: this.app.config.bot.flagId,
        upgrades: encodeUpgrades(0, 0, 0),
      } as ServerPackets.PlayerNew,
      connectionId
    );
  }
}
