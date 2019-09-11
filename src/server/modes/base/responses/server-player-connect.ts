import {
  encodeUpgrades,
  FLAGS_ISO_TO_CODE,
  SERVER_PACKETS,
  ServerPackets,
} from '@airbattle/protocol';
import { PLAYERS_ALIVE_STATUSES, SHIPS_TYPES } from '@/constants';
import { RESPONSE_SERVER_PLAYER_CONNECT, CONNECTIONS_SEND_PACKET } from '@/events';
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
        name: this.storage.serverPlayerName,
        type: SHIPS_TYPES.PREDATOR,
        team: this.storage.serverPlayerId,
        posX: 0,
        posY: 0,
        rot: 0,
        flag: FLAGS_ISO_TO_CODE.JOLLY,
        upgrades: encodeUpgrades(0, 0, 0),
      } as ServerPackets.PlayerNew,
      connectionId
    );
  }
}
