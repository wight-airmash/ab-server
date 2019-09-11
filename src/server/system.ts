import EventEmitter, { ListenerFn } from 'eventemitter3';
import GameServer from '@/core/server';
import { EventChannel } from '@/server/channels/channel';
import { CHANNEL_DEFAULT } from '@/server/channels';
import { Helpers } from '@/server/helpers';
import { GameStorage } from '@/server/storage';
import Logger from '@/logger';
import { Channels } from '@/server/channels/channels';

export class System {
  /**
   * Reference to the game server app.
   */
  protected app: GameServer;

  /**
   * Reference to the log.
   */
  protected log: Logger;

  /**
   * Reference to the event emitter.
   */
  protected events: EventEmitter;

  /**
   * Reference to the game server storage.
   */
  protected storage: GameStorage;

  /**
   * Reference to the server helpers.
   */
  protected helpers: Helpers;

  /**
   * Reference to the event channels.
   */
  protected channels: Channels;

  /**
   * Reference to the default event channel.
   */
  protected defaultChannel: EventChannel;

  /**
   * System listeners.
   */
  public listeners: { [event: string]: ListenerFn };

  constructor({ app }) {
    this.app = app;
    this.log = this.app.log;
    this.events = this.app.events;
    this.storage = this.app.storage;
    this.helpers = this.app.helpers;
    this.channels = this.app.channels;
    this.defaultChannel = this.channel(CHANNEL_DEFAULT);
  }

  /**
   * Get delayed events channel by its name.
   *
   * @param name channel name
   */
  protected channel(name: string): EventChannel {
    return this.channels.channel(name);
  }

  /**
   * Emit event.
   *
   * @param event event name
   * @param args
   */
  protected emit(event: string | symbol, ...args: any[]): void {
    try {
      this.events.emit(event, ...args);
    } catch (err) {
      this.log.error(err, `Error while dispatching ${String(event)}`);
    }
  }

  /**
   * Alias. Delay event into default channel.
   *
   * @param event event name
   * @param args
   */
  protected delay(event: string | symbol, ...args: any[]): void {
    this.defaultChannel.delay(event, ...args);
  }

  /**
   * Alias. Emit all default channel delayed events.
   */
  protected emitDelayed(): void {
    this.defaultChannel.emitDelayed();
  }
}
