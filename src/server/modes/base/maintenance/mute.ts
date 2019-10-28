import { CHAT_MUTE_TIME_MS, CHAT_MIN_PLAYER_PLAYTIME_TO_VOTEMUTE_MS } from '@/constants';
import {
  CHAT_MUTE_EMIT_DELAYED_EVENTS,
  PLAYERS_REMOVED,
  RESPONSE_VOTEMUTE_PASSED,
  CHAT_MUTE_VOTE,
  CHAT_MUTE_BY_SERVER,
  TIMELINE_CLOCK_DAY,
  CHAT_UNMUTE_BY_IP,
  CHAT_MUTE_BY_IP,
  RESPONSE_COMMAND_REPLY,
} from '@/events';
import { System } from '@/server/system';
import { CHANNEL_MUTE } from '@/server/channels';
import { PlayerId, IPv4 } from '@/types';

export default class GameMute extends System {
  protected votes: Map<PlayerId, Set<PlayerId>> = new Map();

  constructor({ app }) {
    super({ app });

    this.listeners = {
      [CHAT_MUTE_EMIT_DELAYED_EVENTS]: this.onEmitDelayedMuteEvents,
      [CHAT_MUTE_VOTE]: this.onVoteMute,
      [PLAYERS_REMOVED]: this.onPlayerRemoved,
      [CHAT_MUTE_BY_SERVER]: this.mutePlayerByServer,
      [TIMELINE_CLOCK_DAY]: this.clearExpired,
      [CHAT_UNMUTE_BY_IP]: this.unmuteByIp,
      [CHAT_MUTE_BY_IP]: this.muteByIp,
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
      this.log.debug(`Player id${playerId} didn't play enough to vote mute.`);

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

    if (votedPlayers.size >= votesToMute) {
      let votes = 0;

      /**
       * Accurate mute check.
       */
      votedPlayers.forEach(votedPlayerId => {
        if (this.helpers.isPlayerConnected(votedPlayerId)) {
          votes += 1;
        } else {
          votedPlayers.delete(votedPlayerId);
        }
      });

      /**
       * Mute player.
       */
      if (votes >= votesToMute) {
        isMuted = true;
        this.log.debug(`Player id${playerToMuteId} muted.`);

        playerToMute.times.unmuteTime = Date.now() + CHAT_MUTE_TIME_MS;
        this.storage.ipMuteList.set(playerToMute.ip.current, playerToMute.times.unmuteTime);

        votedPlayers.forEach(votedPlayerId => {
          this.emit(
            RESPONSE_VOTEMUTE_PASSED,
            this.storage.playerMainConnectionList.get(votedPlayerId),
            playerToMuteId
          );
        });

        this.votes.delete(playerToMuteId);
      }
    }

    if (isMuted === false) {
      this.emit(
        RESPONSE_COMMAND_REPLY,
        this.storage.playerMainConnectionList.get(playerId),
        `Voted to mute (${votedPlayers.size}/${votesToMute}).`
      );
    }
  }

  mutePlayerByServer(playerId: PlayerId): void {
    if (!this.helpers.isPlayerConnected(playerId)) {
      return;
    }

    const player = this.storage.playerList.get(playerId);

    this.muteByIp(player.ip.current, CHAT_MUTE_TIME_MS);

    this.log.debug(`Player id${playerId} was automuted for spam.`);
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
   *
   * @param ip
   * @param expired ms.
   */
  protected updatePlayersMuteExpireTime(ip: IPv4, expired: number): void {
    if (!this.storage.connectionByIPList.has(ip)) {
      return;
    }

    const connectionIdList = this.storage.connectionByIPList.get(ip);

    connectionIdList.forEach(connectionId => {
      if (!this.storage.connectionList.has(connectionId)) {
        return;
      }

      const connection = this.storage.connectionList.get(connectionId);

      if (!this.storage.playerList.has(connection.meta.playerId)) {
        return;
      }

      const player = this.storage.playerList.get(connection.meta.playerId);

      player.times.unmuteTime = expired;
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
}
