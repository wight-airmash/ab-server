import { encodeUpgrades, ServerPackets, SERVER_PACKETS } from '@airbattle/protocol';
import { CONNECTIONS_SEND_PACKETS, RESPONSE_LOGIN, TIMELINE_BEFORE_GAME_START } from '../../events';
import { LoginServerConfig, MainConnectionId, Player } from '../../types';
import { System } from '../system';

export default class LoginResponse extends System {
  /**
   * Server config JSON string.
   */
  private serverConfiguration: string;

  constructor({ app }) {
    super({ app });

    this.listeners = {
      [RESPONSE_LOGIN]: this.onLoginResponse,
      [TIMELINE_BEFORE_GAME_START]: this.prepareServerConfiguration,
    };
  }

  prepareServerConfiguration(): void {
    const config: LoginServerConfig = {
      sf: this.config.server.scaleFactor,
      botsNamePrefix: this.config.bots.prefix,
    };

    if (this.config.connections.afkDisconnectTimeout) {
      config.afk = this.config.connections.afkDisconnectTimeout;
    }

    this.serverConfiguration = JSON.stringify(config);
  }

  /**
   * Response to player's `Login` request.
   *
   * @param connectionId
   */
  onLoginResponse(connectionId: MainConnectionId): void {
    const connection = this.storage.connectionList.get(connectionId);
    const loggedInPlayer = this.storage.playerList.get(connection.playerId);
    const players: ServerPackets.LoginPlayer[] = [];
    const bots: ServerPackets.LoginBot[] = [];
    const playersIterator = this.storage.playerList.values();
    let player: Player = playersIterator.next().value;

    while (player !== undefined) {
      players.push({
        id: player.id.current,
        status: player.alivestatus.current,
        level: player.level.current,
        name: player.name.current,
        type: player.planetype.current,
        team: player.team.current,
        posX: player.position.x,
        posY: player.position.y,
        rot: player.rotation.current,
        flag: player.flag.code,
        upgrades: encodeUpgrades(
          player.upgrades.speed,
          ~~player.shield.current,
          ~~player.inferno.current
        ),
      });

      if (player.bot.current) {
        bots.push({
          id: player.id.current,
        });
      }

      player = playersIterator.next().value;
    }

    this.emit(
      CONNECTIONS_SEND_PACKETS,
      {
        c: SERVER_PACKETS.LOGIN,
        success: true,
        id: loggedInPlayer.id.current,
        team: loggedInPlayer.team.current,
        clock: this.helpers.clock(),
        token: loggedInPlayer.backuptoken.current,
        type: this.config.server.typeId,
        room: this.config.server.room,
        players,
        serverConfiguration: this.serverConfiguration,
        bots,
      } as ServerPackets.Login,
      connectionId
    );
  }
}
