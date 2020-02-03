import { CHAT_MESSAGE_PER_TICKS_LIMIT, PLAYERS_ALIVE_STATUSES } from '@/constants';
import {
  BROADCAST_CHAT_PUBLIC,
  BROADCAST_CHAT_SAY,
  BROADCAST_CHAT_SERVER_WHISPER,
  BROADCAST_CHAT_TEAM,
  BROADCAST_CHAT_WHISPER,
  CHAT_EMIT_DELAYED_EVENTS,
  CHAT_PUBLIC,
  CHAT_SAY,
  CHAT_TEAM,
  CHAT_WHISPER,
  CTF_BOT_CHAT_TEAM,
  RESPONSE_COMMAND_REPLY,
} from '@/events';
import { CHANNEL_CHAT } from '@/server/channels';
import { System } from '@/server/system';
import { PlayerId } from '@/types';

export default class GameChat extends System {
  private framesPassed = 0;

  protected readonly responseAttackBlock =
    "This command isn't allowed: https://github.com/wight-airmash/ab-server/issues/53";

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
    this.framesPassed += 1;

    if (this.framesPassed < CHAT_MESSAGE_PER_TICKS_LIMIT) {
      return;
    }

    this.channel(CHANNEL_CHAT).emitFirstDelayed();
    this.framesPassed = 0;
  }

  protected static isAttackCommand(msg: string): boolean {
    if (msg.charAt(0) !== '#' || msg.length > 7) {
      return false;
    }

    const command = msg.toLowerCase();

    if (command === '#attack' || command === '#atack') {
      return true;
    }

    return false;
  }

  protected static isShieldTimerAlert(msg: string): boolean {
    return msg.endsWith('seconds till enemy shield');
  }

  onChatPublic(playerId: PlayerId, msg: string): void {
    if (!this.helpers.isPlayerConnected(playerId)) {
      return;
    }

    if (GameChat.isAttackCommand(msg) === false) {
      this.emit(BROADCAST_CHAT_PUBLIC, playerId, msg);
    } else {
      this.emit(BROADCAST_CHAT_SERVER_WHISPER, playerId, this.responseAttackBlock);
    }
  }

  onChatSay(playerId: PlayerId, msg: string): void {
    if (!this.helpers.isPlayerConnected(playerId)) {
      return;
    }

    const player = this.storage.playerList.get(playerId);

    if (
      player.planestate.stealthed === false &&
      player.alivestatus.current === PLAYERS_ALIVE_STATUSES.ALIVE
    ) {
      this.emit(BROADCAST_CHAT_SAY, playerId, msg);
    } else {
      this.emit(
        RESPONSE_COMMAND_REPLY,
        this.storage.playerMainConnectionList.get(playerId),
        'You have to be visible to use "/s".'
      );
    }
  }

  onChatTeam(playerId: PlayerId, msg: string): void {
    if (!this.helpers.isPlayerConnected(playerId)) {
      return;
    }

    if (GameChat.isAttackCommand(msg) === true) {
      this.emit(BROADCAST_CHAT_SERVER_WHISPER, playerId, this.responseAttackBlock);
    } else if (GameChat.isShieldTimerAlert(msg) === false) {
      this.emit(BROADCAST_CHAT_TEAM, playerId, msg);
    }

    if (this.storage.botIdList.has(playerId) === true) {
      this.emit(CTF_BOT_CHAT_TEAM, playerId, msg);
    }
  }

  onChatWhisper(playerId: PlayerId, receiverId: PlayerId, msg: string): void {
    if (!this.helpers.isPlayerConnected(playerId) || !this.helpers.isPlayerConnected(receiverId)) {
      return;
    }

    this.emit(BROADCAST_CHAT_WHISPER, playerId, receiverId, msg);
  }
}
