import { CHAT_MIN_PLAYER_PLAYTIME_TO_VOTEMUTE_MS, CHAT_MUTE_TIME_MS } from '../../constants';
import {
  CHAT_MUTE_BY_IP,
  CHAT_MUTE_BY_SERVER,
  CHAT_MUTE_EMIT_DELAYED_EVENTS,
  CHAT_MUTE_VOTE,
  CHAT_UNMUTE_BY_IP,
  PLAYERS_REMOVED,
  RESPONSE_COMMAND_REPLY,
  RESPONSE_VOTEMUTE_PASSED,
  TIMELINE_CLOCK_DAY,
} from '../../events';
import { CHANNEL_MUTE } from '../../events/channels';
import { IPv4, PlayerId, ConnectionId } from '../../types';
import { System } from '../system';

export default class GameMute extends System {
  private votes: Map<PlayerId, Set<PlayerId>> = new Map();

  constructor({ app }) {
    super({ app });

    this.listeners = {
      [CHAT_MUTE_BY_IP]: this.muteByIp,
      [CHAT_MUTE_BY_SERVER]: this.mutePlayerByServer,
      [CHAT_MUTE_EMIT_DELAYED_EVENTS]: this.onEmitDelayedMuteEvents,
      [CHAT_MUTE_VOTE]: this.onVoteMute,
      [CHAT_UNMUTE_BY_IP]: this.unmuteByIp,
      [PLAYERS_REMOVED]: this.onPlayerRemoved,
      [TIMELINE_CLOCK_DAY]: this.clearExpired,
    };
  }

  /**
   * Emit delayed events.
   */
  onEmitDelayedMuteEvents(): void {
    this.channel(CHANNEL_MUTE).emitDelayed();
  }

  onPlayerRemoved(playerId: PlayerId): void {
    this.votes.delete(playerId);
  }

  onVoteMute(playerId: PlayerId, playerToMuteId: PlayerId): void {
    if (
      !this.helpers.isPlayerConnected(playerId) ||
      !this.helpers.isPlayerConnected(playerToMuteId)
    ) {
      return;
    }

    const player = this.storage.playerList.get(playerId);
    const playerToMute = this.storage.playerList.get(playerToMuteId);

    if (player.times.activePlaying < CHAT_MIN_PLAYER_PLAYTIME_TO_VOTEMUTE_MS) {
      this.emit(
        RESPONSE_COMMAND_REPLY,
        this.storage.playerMainConnectionList.get(playerId),
        `The vote isn't counted. Only active players can vote, please play more.`
      );

      return;
    }

    if (this.votes.has(playerToMuteId)) {
      this.votes.get(playerToMuteId).add(playerId);
    } else {
      this.votes.set(playerToMuteId, new Set([playerId]));
    }

    const votesToMute = Math.floor(Math.sqrt(this.storage.humanConnectionIdList.size)) + 1;
    const votedPlayers = this.votes.get(playerToMuteId);

    /**
     * Fast mute check.
     */
    let isMuted = false;
    let validVotes = votedPlayers.size;

    if (votedPlayers.size >= votesToMute) {
      const uniqueIPs: Set<IPv4> = new Set();

      /**
       * Accurate mute check.
       */
      validVotes = 0;

      votedPlayers.forEach(votedPlayerId => {
        if (this.helpers.isPlayerConnected(votedPlayerId)) {
          const votedPlayer = this.storage.playerList.get(votedPlayerId);

          /**
           * This condition can be weakened if additional conditions are passed:
           * - increased minimum playing time,
           * - minimum shots,
           * - minimum hits,
           * - minimum kills,
           * - etc.
           */
          if (!uniqueIPs.has(votedPlayer.ip.current)) {
            uniqueIPs.add(votedPlayer.ip.current);

            validVotes += 1;
          }
        } else {
          votedPlayers.delete(votedPlayerId);
        }
      });

      /**
       * Mute player.
       */
      if (validVotes >= votesToMute) {
        this.log.info('Player was muted by other players: %o', {
          playerId: playerToMuteId,
          votes: [...votedPlayers],
        });

        isMuted = true;
        playerToMute.times.unmuteTime = Date.now() + CHAT_MUTE_TIME_MS;
        this.storage.ipMuteList.set(playerToMute.ip.current, playerToMute.times.unmuteTime);

        const playersIterator = votedPlayers.values();
        let votedPlayerId: PlayerId = playersIterator.next().value;

        while (votedPlayerId !== undefined) {
          this.emit(
            RESPONSE_VOTEMUTE_PASSED,
            this.storage.playerMainConnectionList.get(votedPlayerId),
            playerToMuteId
          );

          votedPlayerId = playersIterator.next().value;
        }

        this.votes.delete(playerToMuteId);
      }
    }

    if (!isMuted) {
      this.emit(
        RESPONSE_COMMAND_REPLY,
        this.storage.playerMainConnectionList.get(playerId),
        `Voted to mute ${playerToMute.name.current} (${validVotes}/${votesToMute}).`
      );
    }
  }

  mutePlayerByServer(playerId: PlayerId): void {
    if (!this.helpers.isPlayerConnected(playerId)) {
      return;
    }

    const player = this.storage.playerList.get(playerId);

    this.muteByIp(player.ip.current, CHAT_MUTE_TIME_MS);

    this.log.info('Player was automuted for spam: %o', {
      playerId,
    });
  }

  clearExpired(): void {
    const now = Date.now();

    this.storage.ipMuteList.forEach((unmuteTime, ip) => {
      if (now > unmuteTime) {
        this.unmuteByIp(ip);
      }
    });
  }

  /**
   * Unmute IP and related connected players.
   */
  unmuteByIp(ip: IPv4): void {
    const expired = Date.now() - 1;

    this.storage.ipMuteList.delete(ip);

    this.updatePlayersMuteExpireTime(ip, expired);
  }

  /**
   * Mute IP and related connected players.
   *
   * @param ip
   * @param duration ms.
   */
  muteByIp(ip: IPv4, duration: number): void {
    const expired = Date.now() + duration;

    this.storage.ipMuteList.set(ip, expired);

    this.updatePlayersMuteExpireTime(ip, expired);
  }

  /**
   *
   * @param ip
   * @param expired ms.
   */
  private updatePlayersMuteExpireTime(ip: IPv4, expired: number): void {
    if (!this.storage.connectionByIPList.has(ip)) {
      return;
    }

    const connectionsIterator = this.storage.connectionByIPList.get(ip).values();
    let connectionId: ConnectionId = connectionsIterator.next().value;

    while (connectionId !== undefined) {
      const connection = this.storage.connectionList.get(connectionId);

      if (!connection || !this.storage.playerList.has(connection.playerId)) {
        connectionId = connectionsIterator.next().value;

        continue;
      }

      const player = this.storage.playerList.get(connection.playerId);

      player.times.unmuteTime = expired;
      connectionId = connectionsIterator.next().value;
    }
  }
}
