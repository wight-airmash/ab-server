import { encodeUpgrades, ServerPackets, SERVER_PACKETS } from '@airbattle/protocol';
import { CONNECTIONS_SEND_PACKET, RESPONSE_LOGIN, TIMELINE_BEFORE_GAME_START } from '@/events';
import { System } from '@/server/system';
import { LoginServerConfig, MainConnectionId } from '@/types';

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
      sf: this.app.config.server.scaleFactor,
      botsNamePrefix: this.app.config.botsNamePrefix,
    };

    if (this.app.config.afkDisconnectTimeout) {
      config.afk = this.app.config.afkDisconnectTimeout;
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
    const player = this.storage.playerList.get(connection.meta.playerId);
    const players: ServerPackets.LoginPlayer[] = [];
    const bots: ServerPackets.LoginBot[] = [];

    /**
     * TODO: it is possible to keep the list up to date and not re-create it
     * every time a new player connected.
     */
    this.storage.playerList.forEach(p => {
      players.push({
        id: p.id.current,
        status: p.alivestatus.current,
        level: p.level.current,
        name: p.name.current,
        type: p.planetype.current,
        team: p.team.current,
        posX: p.position.x,
        posY: p.position.y,
        rot: p.rotation.current,
        flag: p.flag.code,
        upgrades: encodeUpgrades(p.upgrades.speed, ~~p.shield.current, ~~p.inferno.current),
      });

      if (this.storage.botIdList.has(p.id.current)) {
        bots.push({
          id: p.id.current,
        });
      }
    });

    this.emit(
      CONNECTIONS_SEND_PACKET,
      {
        c: SERVER_PACKETS.LOGIN,
        success: true,
        id: player.id.current,
        team: player.team.current,
        clock: this.helpers.clock(),
        token: player.backuptoken.current,
        type: this.app.config.server.typeId,
        room: this.app.config.server.room,
        players,
        serverConfiguration: this.serverConfiguration,
        bots,
      } as ServerPackets.Login,
      connectionId
    );
  }
}
