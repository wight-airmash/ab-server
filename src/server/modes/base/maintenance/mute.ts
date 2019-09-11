import { CHAT_MUTE_TIME_MS, CHAT_MIN_PLAYER_PLAYTIME_TO_VOTEMUTE_MS } from '@/constants';
import {
  CHAT_MUTE_EMIT_DELAYED_EVENTS,
  PLAYERS_REMOVED,
  RESPONSE_VOTEMUTE_PASSED,
  CHAT_MUTE_VOTE,
  CHAT_MUTE_BY_SERVER,
  TIMELINE_CLOCK_DAY,
} from '@/events';
import { System } from '@/server/system';
import { CHANNEL_VOTE_MUTE } from '@/server/channels';
import { PlayerId } from '@/types';

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
    };
  }

  /**
   * Emit delayed events.
   */
  onEmitDelayedMuteEvents(): void {
    this.channel(CHANNEL_VOTE_MUTE).emitDelayed();
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
      this.log.debug(`Player id${playerId} didn't play enough to vote mute.`);

      return;
    }

    if (this.votes.has(playerToMuteId)) {
      this.votes.get(playerToMuteId).add(playerId);
    } else {
      this.votes.set(playerToMuteId, new Set([playerId]));
    }

    const votesToMute = Math.floor(Math.sqrt(this.storage.playerList.size)) + 1;
    const votedPlayers = this.votes.get(playerToMuteId);

    /**
     * Fast mute check.
     */
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
  }

  mutePlayerByServer(playerId: PlayerId): void {
    if (!this.helpers.isPlayerConnected(playerId)) {
      return;
    }

    const player = this.storage.playerList.get(playerId);

    player.times.unmuteTime = Date.now() + CHAT_MUTE_TIME_MS;
    this.storage.ipMuteList.set(player.ip.current, player.times.unmuteTime);

    this.log.debug(`Player id${playerId} automute.`);
  }

  clearExpired(): void {
    const now = Date.now();

    this.storage.ipMuteList.forEach((unmuteTime, ip) => {
      if (now > unmuteTime) {
        this.storage.ipMuteList.delete(ip);
      }
    });
  }
}
