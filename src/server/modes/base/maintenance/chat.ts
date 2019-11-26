import { CHAT_MESSAGE_PER_TICKS_LIMIT, CHAT_HATE_SPEECH_FORBIDDEN_PHRASES } from '@/constants';
import {
  BROADCAST_CHAT_PUBLIC,
  BROADCAST_CHAT_SAY,
  BROADCAST_CHAT_TEAM,
  BROADCAST_CHAT_WHISPER,
  CHAT_EMIT_DELAYED_EVENTS,
  CHAT_PUBLIC,
  CHAT_SAY,
  CHAT_TEAM,
  CHAT_WHISPER,
} from '@/events';
import { CHANNEL_CHAT } from '@/server/channels';
import { System } from '@/server/system';
import { PlayerId } from '@/types';

export default class GameChat extends System {
  private framesPassed = 0;

  constructor({ app }) {
    super({ app });

    this.listeners = {
      [CHAT_EMIT_DELAYED_EVENTS]: this.onHandleChatMessages,
      [CHAT_PUBLIC]: this.onChatPublic,
      [CHAT_SAY]: this.onChatSay,
      [CHAT_TEAM]: this.onChatTeam,
      [CHAT_WHISPER]: this.onChatWhisper,
    };
  }

  onHandleChatMessages(): void {
    /**
     * TODO:
     * 1. Forbidden words.
     * 2. Throttling.
     * 3. Non-break length check.
     * 4. Custom filters (like % of non-language characters).
     */

    this.framesPassed += 1;

    if (this.framesPassed < CHAT_MESSAGE_PER_TICKS_LIMIT) {
      return;
    }

    this.channel(CHANNEL_CHAT).emitFirstDelayed();
    this.framesPassed = 0;
  }

  static isHateSpeech(text: string): boolean {
    const lcText = text.toLowerCase();

    for (
      let phraseIndex = 0;
      phraseIndex < CHAT_HATE_SPEECH_FORBIDDEN_PHRASES.length;
      phraseIndex += 1
    ) {
      const phrase = CHAT_HATE_SPEECH_FORBIDDEN_PHRASES[phraseIndex];

      if (lcText.includes(phrase)) {
        return true;
      }
    }

    return false;
  }

  onChatPublic(playerId: PlayerId, msg: string): void {
    if (!this.helpers.isPlayerConnected(playerId)) {
      return;
    }

    if (!GameChat.isHateSpeech(msg)) {
      this.emit(BROADCAST_CHAT_PUBLIC, playerId, msg);
    }
  }

  onChatSay(playerId: PlayerId, msg: string): void {
    if (!this.helpers.isPlayerConnected(playerId)) {
      return;
    }

    const player = this.storage.playerList.get(playerId);

    if (!GameChat.isHateSpeech(msg)) {
      if (player.planestate.stealthed === false) {
        this.emit(BROADCAST_CHAT_SAY, playerId, msg);
      }
    }
  }

  onChatTeam(playerId: PlayerId, msg: string): void {
    if (!this.helpers.isPlayerConnected(playerId)) {
      return;
    }

    if (!GameChat.isHateSpeech(msg)) {
      this.emit(BROADCAST_CHAT_TEAM, playerId, msg);
    }
  }

  onChatWhisper(playerId: PlayerId, receiverId: PlayerId, msg: string): void {
    if (!this.helpers.isPlayerConnected(playerId) || !this.helpers.isPlayerConnected(receiverId)) {
      return;
    }

    if (!GameChat.isHateSpeech(msg)) {
      this.emit(BROADCAST_CHAT_WHISPER, playerId, receiverId, msg);
    }
  }
}
