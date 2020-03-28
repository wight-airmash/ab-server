import { CTF_TEAMS } from '@airbattle/protocol';
import { CTF_PLAYERS_COMMAND_BROADCAST_DELAY_MS } from '@/constants';
import {
  BROADCAST_CHAT_PUBLIC,
  BROADCAST_CHAT_SERVER_PUBLIC,
  BROADCAST_CHAT_SERVER_WHISPER,
  CTF_PLAYER_SWITCHED,
  CTF_TEAMS_RESHUFFLED,
  CTF_TEAM_CAPTURED_FLAG,
  PLAYERS_CREATED,
  PLAYERS_REMOVED,
  PLAYERS_RESPAWNED,
  PLAYERS_STATS_ANNOUNCE,
  PLAYERS_SWITCHED_TO_SPECTATE,
  TIMELINE_GAME_MATCH_START,
  TIMELINE_LOOP_TICK,
} from '@/events';
import { CHANNEL_PLAYERS_STATS } from '@/server/channels';
import { System } from '@/server/system';
import { PlayerId } from '@/types';

export default class GamePlayersStats extends System {
  private lastPublicBroadcastAt = 0;

  private isStatsOutdated = true;

  private cachedResponseMessage = '';

  constructor({ app }) {
    super({ app });

    this.listeners = {
      // Channels.
      [TIMELINE_LOOP_TICK]: this.onEmitDelayedEvents,

      // Events.
      [CTF_PLAYER_SWITCHED]: this.setStatsOutdated,
      [CTF_TEAM_CAPTURED_FLAG]: this.onTeamCaptured,
      [CTF_TEAMS_RESHUFFLED]: this.setStatsOutdated,
      [PLAYERS_CREATED]: this.setStatsOutdated,
      [PLAYERS_REMOVED]: this.setStatsOutdated,
      [PLAYERS_RESPAWNED]: this.onPlayerRespawned,
      [PLAYERS_STATS_ANNOUNCE]: this.onAnnounceRequest,
      [PLAYERS_SWITCHED_TO_SPECTATE]: this.setStatsOutdated,
      [TIMELINE_GAME_MATCH_START]: this.setStatsOutdated,
    };
  }

  onEmitDelayedEvents(): void {
    this.channel(CHANNEL_PLAYERS_STATS).emitDelayed();
  }

  private getResponseMessage(): string {
    if (!this.isStatsOutdated) {
      return this.cachedResponseMessage;
    }

    const blueTeam = {
      humans: 0,
      humansSpec: 0,
      bots: 0,
      botsSpec: 0,
    };

    const redTeam = {
      humans: 0,
      humansSpec: 0,
      bots: 0,
      botsSpec: 0,
    };

    this.storage.playerList.forEach(player => {
      let stats = null;

      if (player.team.current === CTF_TEAMS.BLUE) {
        stats = blueTeam;
      } else {
        stats = redTeam;
      }

      if (this.storage.botIdList.has(player.id.current)) {
        stats.bots += 1;

        if (player.spectate.isActive) {
          stats.botsSpec += 1;
        }
      } else {
        stats.humans += 1;

        if (player.spectate.isActive) {
          stats.humansSpec += 1;
        }
      }
    });

    this.isStatsOutdated = false;
    this.cachedResponseMessage = `${blueTeam.humans - blueTeam.humansSpec} vs ${
      redTeam.humans - redTeam.humansSpec
    } humans, ${blueTeam.bots - blueTeam.botsSpec} vs ${redTeam.bots - redTeam.botsSpec} bots, ${
      blueTeam.humans + blueTeam.bots - blueTeam.humansSpec - blueTeam.botsSpec
    } vs ${redTeam.humans + redTeam.bots - redTeam.humansSpec - redTeam.botsSpec} total.`;

    return this.cachedResponseMessage;
  }

  setStatsOutdated(): void {
    this.isStatsOutdated = true;
  }

  onPlayerRespawned(playerId: PlayerId, isSpectateBefore: boolean): void {
    if (isSpectateBefore) {
      this.setStatsOutdated();
    }
  }

  onAnnounceRequest(playerId: PlayerId, command: string): void {
    if (!this.helpers.isPlayerConnected(playerId)) {
      return;
    }

    const responseMessage = this.getResponseMessage();
    const now = Date.now();

    if (
      command === 'whisper' ||
      this.lastPublicBroadcastAt > now - CTF_PLAYERS_COMMAND_BROADCAST_DELAY_MS ||
      this.helpers.isPlayerMuted(playerId)
    ) {
      this.emit(BROADCAST_CHAT_SERVER_WHISPER, playerId, responseMessage);
    } else {
      this.lastPublicBroadcastAt = now;

      this.emit(BROADCAST_CHAT_PUBLIC, playerId, '/players');
      this.emit(BROADCAST_CHAT_SERVER_PUBLIC, responseMessage);
    }
  }

  onTeamCaptured(): void {
    const now = Date.now();

    if (this.lastPublicBroadcastAt <= now - CTF_PLAYERS_COMMAND_BROADCAST_DELAY_MS) {
      this.lastPublicBroadcastAt = now;

      this.emit(BROADCAST_CHAT_SERVER_PUBLIC, this.getResponseMessage());
    }
  }
}
