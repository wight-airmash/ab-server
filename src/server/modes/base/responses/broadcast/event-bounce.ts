import { encodeKeystate, ServerPackets, SERVER_PACKETS } from '@airbattle/protocol';
import { BROADCAST_EVENT_BOUNCE, CONNECTIONS_SEND_PACKET } from '@/events';
import { System } from '@/server/system';
import { MainConnectionId, PlayerId } from '@/types';

export default class EventBounceBroadcast extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [BROADCAST_EVENT_BOUNCE]: this.onEventBounce,
    };
  }

  /**
   * Sent on:
   * 1. Visible player bounced.
   *
   * Broadcast to all players who sees the player.
   *
   * @param playerId
   */
  onEventBounce(playerId: PlayerId): void {
    if (!this.helpers.isPlayerConnected(playerId) || !this.storage.broadcast.has(playerId)) {
      return;
    }

    const player = this.storage.playerList.get(playerId);
    const playerConnectionId = this.storage.playerMainConnectionList.get(playerId);
    const playerTeamConnections = this.storage.connectionIdByTeam.get(player.team.current);
    const recipients: MainConnectionId[] = [];

    this.storage.broadcast.get(playerId).forEach(recipientConnectionId => {
      const recipientConnection = this.storage.connectionList.get(recipientConnectionId);
      const recipient = this.storage.playerList.get(recipientConnection.meta.playerId);

      /**
       * Visibility check.
       */
      if (
        playerConnectionId === recipientConnectionId ||
        player.planestate.stealthed === false ||
        (player.planestate.stealthed === true &&
          playerTeamConnections.has(recipientConnectionId) &&
          (recipient.spectate.isActive === false || this.app.config.visibleTeamProwlers === true))
      ) {
        recipients.push(recipientConnectionId);
      }
    });

    this.emit(
      CONNECTIONS_SEND_PACKET,
      {
        c: SERVER_PACKETS.EVENT_BOUNCE,
        clock: this.helpers.clock(),
        id: playerId,
        keystate: encodeKeystate(
          player.keystate,
          player.planestate.boost,
          player.planestate.strafe,
          player.planestate.stealthed,
          player.planestate.flagspeed
        ),
        posX: player.position.x,
        posY: player.position.y,
        rot: player.rotation.current,
        speedX: player.velocity.x,
        speedY: player.velocity.y,
      } as ServerPackets.EventBounce,
      recipients
    );
  }
}
