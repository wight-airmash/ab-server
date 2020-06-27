import { encodeKeystate, encodeUpgrades, ServerPackets, SERVER_PACKETS } from '@airbattle/protocol';
import { BROADCAST_PLAYER_UPDATE, CONNECTIONS_SEND_PACKETS } from '../../../events';
import { ConnectionId, PlayerId } from '../../../types';
import { System } from '../../system';

export default class PlayerUpdateBroadcast extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [BROADCAST_PLAYER_UPDATE]: this.onPlayerUpdate,
    };
  }

  /**
   * Sent on:
   * 1. Change key state.
   * 2. Change airplane visibility state.
   * 3. Player powerup state update (get or lose shield/inferno).
   * 4. Apply or lose speed upgrades.
   * 5. Player intersects with player's viewport (only once,
   * at the moment of intersection).
   * 6. Player was hitted, if before hit player was invisible.
   * 7. Player stopped (0 speed).
   * 8. Player achieved max speed.
   * 9. Player became visible (prowlers only).
   * 10. Player energy became full.
   * 11. Player energy became min (`PLAYERS_ENERGY.MIN`).
   * 12. Player health became full.
   * 13. Player was repeled.
   * 14. Player took CTF flag.
   * 15. Player drop/lose CTF flag.
   * 16. Periodic broadcast. Each player must emit `PLAYER_UPDATE` event
   * at least one per 3 seconds, otherwise the frontend desides that player
   * disconnected or switched into spectate mode and removes the player object
   * from the screen.
   *
   * Broadcast to all player who sees the event owner or to one player.
   *
   * @param playerId
   * @param recipientId
   */
  onPlayerUpdate(playerId: PlayerId, recipientId?: PlayerId): void {
    if (!this.helpers.isPlayerConnected(playerId)) {
      return;
    }

    const player = this.storage.playerList.get(playerId);
    const playerTeamConnections = this.storage.connectionIdByTeam.get(player.team.current);
    const recipients: ConnectionId[] = [];
    let isHorizonUpdate = false;

    if (recipientId !== undefined) {
      isHorizonUpdate = true;

      if (!this.helpers.isPlayerConnected(recipientId)) {
        return;
      }

      const recipient = this.storage.playerList.get(recipientId);
      const recipientConnectionId = this.storage.playerMainConnectionList.get(recipientId);

      if (
        recipientId === playerId ||
        !player.planestate.stealthed ||
        (player.planestate.stealthed &&
          playerTeamConnections.has(recipientConnectionId) &&
          (!recipient.spectate.isActive || this.config.visibleTeamProwlers))
      ) {
        recipients.push(recipientConnectionId);
      }
    } else if (this.storage.broadcast.has(playerId)) {
      const playerConnectionId = this.storage.playerMainConnectionList.get(playerId);

      const broadcastIterator = this.storage.broadcast.get(playerId).values();
      let recipientConnectionId: ConnectionId = broadcastIterator.next().value;

      while (recipientConnectionId !== undefined) {
        if (!this.storage.connectionList.has(recipientConnectionId)) {
          recipientConnectionId = broadcastIterator.next().value;

          continue;
        }

        const recipientConnection = this.storage.connectionList.get(recipientConnectionId);
        const recipient = this.storage.playerList.get(recipientConnection.playerId);

        if (
          playerConnectionId === recipientConnectionId ||
          !player.planestate.stealthed ||
          (player.planestate.stealthed &&
            playerTeamConnections.has(recipientConnectionId) &&
            (!recipient.spectate.isActive || this.config.visibleTeamProwlers))
        ) {
          recipients.push(recipientConnectionId);

          if (
            playerConnectionId === recipientConnectionId &&
            this.storage.playerBackupConnectionList.has(playerId)
          ) {
            recipients.push(this.storage.playerBackupConnectionList.get(playerId));
          }
        }

        recipientConnectionId = broadcastIterator.next().value;
      }
    }

    if (recipients.length === 0) {
      return;
    }

    this.emit(
      CONNECTIONS_SEND_PACKETS,
      {
        c: SERVER_PACKETS.PLAYER_UPDATE,
        clock: this.helpers.clock(),
        id: player.id.current,
        keystate: encodeKeystate(
          player.keystate,
          player.planestate.boost,
          player.planestate.strafe,
          player.planestate.stealthed,
          player.planestate.flagspeed
        ),
        upgrades: encodeUpgrades(
          player.upgrades.speed,
          ~~player.shield.current,
          ~~player.inferno.current
        ),
        posX: player.position.x,
        posY: player.position.y,
        rot: player.rotation.current,
        speedX: player.velocity.x,
        speedY: player.velocity.y,
      } as ServerPackets.PlayerUpdate,
      recipients
    );

    if (!isHorizonUpdate) {
      player.times.lastUpdatePacket = Date.now();
      player.delayed.BROADCAST_PLAYER_UPDATE = false;
    }
  }
}
