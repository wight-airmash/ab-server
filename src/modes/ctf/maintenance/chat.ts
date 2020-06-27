import {
  CHAT_MESSAGE_PER_TICKS_LIMIT,
  CHAT_SAY_LIFETIME_MS,
  CHAT_USERNAME_PLACEHOLDER,
  PLAYERS_ALIVE_STATUSES,
} from '../../../constants';
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
  CHAT_WELCOME,
  CHAT_WHISPER,
  CTF_BOT_CHAT_TEAM,
  CTF_DROP_FLAG_NOW,
  RESPONSE_COMMAND_REPLY,
} from '../../../events';
import { CHANNEL_CHAT } from '../../../events/channels';
import { System } from '../../../server/system';
import { PlayerId } from '../../../types';

export default class GameChat extends System {
  private readonly usernamePlaceholderRegexp = new RegExp(CHAT_USERNAME_PLACEHOLDER, 'g');

  private readonly responseAttackBlock =
    "This command isn't allowed: https://github.com/wight-airmash/ab-server/issues/53";

  private readonly responseQBotsHelp = `Commands: #cap (or #capture, #escort),
  #recap (or #recover), #defend, #auto, #assist <player | me>, #drop, #leader <player>, #status.
  Type #help <command without #> to see more details.
  If you play on starma.sh, you can bind those commands in team radio menu (key x).
  `;

  private framesPassed = 0;

  constructor({ app }) {
    super({ app });

    this.listeners = {
      [CHAT_EMIT_DELAYED_EVENTS]: this.onHandleChatMessages,
      [CHAT_PUBLIC]: this.onChatPublic,
      [CHAT_SAY]: this.onChatSay,
      [CHAT_TEAM]: this.onChatTeam,
      [CHAT_WELCOME]: this.onWelcomeMessage,
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

  protected static isHelpCommand(msg: string): boolean {
    if (msg.charAt(0) !== '#' || msg.length > 5) {
      return false;
    }

    const command = msg.toLowerCase();

    if (command === '#help') {
      return true;
    }

    return false;
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

  protected static isDropNowCommand(msg: string): boolean {
    return msg === '#dropnow';
  }

  onChatPublic(playerId: PlayerId, msg: string): void {
    if (!this.helpers.isPlayerConnected(playerId)) {
      return;
    }

    if (GameChat.isAttackCommand(msg)) {
      this.emit(BROADCAST_CHAT_SERVER_WHISPER, playerId, this.responseAttackBlock);
    } else if (GameChat.isHelpCommand(msg)) {
      this.emit(BROADCAST_CHAT_SERVER_WHISPER, playerId, this.responseQBotsHelp);
    } else {
      this.emit(BROADCAST_CHAT_PUBLIC, playerId, msg);
    }
  }

  onChatSay(playerId: PlayerId, msg: string): void {
    if (!this.helpers.isPlayerConnected(playerId)) {
      return;
    }

    const player = this.storage.playerList.get(playerId);

    if (
      !player.planestate.stealthed &&
      player.alivestatus.current === PLAYERS_ALIVE_STATUSES.ALIVE
    ) {
      player.say.text = msg;
      player.say.createdAt = Date.now();
      this.storage.playerIdSayBroadcastList.add(playerId);

      clearTimeout(player.say.resetTimeout);

      player.say.resetTimeout = setTimeout(() => {
        this.storage.playerIdSayBroadcastList.delete(playerId);
      }, CHAT_SAY_LIFETIME_MS);

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

    if (GameChat.isAttackCommand(msg)) {
      this.emit(BROADCAST_CHAT_SERVER_WHISPER, playerId, this.responseAttackBlock);
    } else if (GameChat.isHelpCommand(msg)) {
      this.emit(BROADCAST_CHAT_SERVER_WHISPER, playerId, this.responseQBotsHelp);
    } else if (!GameChat.isShieldTimerAlert(msg)) {
      this.emit(BROADCAST_CHAT_TEAM, playerId, msg);

      if (GameChat.isDropNowCommand(msg)) {
        this.emit(CTF_DROP_FLAG_NOW, playerId);
      }
    }

    if (this.storage.botIdList.has(playerId)) {
      this.emit(CTF_BOT_CHAT_TEAM, playerId, msg);
    }
  }

  onChatWhisper(playerId: PlayerId, receiverId: PlayerId, msg: string): void {
    if (!this.helpers.isPlayerConnected(playerId) || !this.helpers.isPlayerConnected(receiverId)) {
      return;
    }

    this.emit(BROADCAST_CHAT_WHISPER, playerId, receiverId, msg);
  }

  onWelcomeMessage(playerId: PlayerId): void {
    if (!this.helpers.isPlayerConnected(playerId)) {
      return;
    }

    const player = this.storage.playerList.get(playerId);

    for (let msgIndex = 0; msgIndex < this.config.server.bot.welcome.length; msgIndex += 1) {
      const msg = this.config.server.bot.welcome[msgIndex].replace(
        this.usernamePlaceholderRegexp,
        player.name.current
      );

      this.emit(BROADCAST_CHAT_SERVER_WHISPER, playerId, msg);
    }
  }
}
