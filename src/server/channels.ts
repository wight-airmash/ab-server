import EventEmitter from 'eventemitter3';
import Logger from '../logger';
import { EventChannel } from './event-channel';

export class Channels {
  protected channels: { [name: string]: EventChannel } = {};

  constructor(
    { eventEmitter, log }: { eventEmitter: EventEmitter; log: Logger },
    ...channels: string[]
  ) {
    for (let index = 0; index < channels.length; index += 1) {
      this.channels[channels[index]] = new EventChannel({ eventEmitter, log });
    }
  }

  channel(name: string): EventChannel {
    return this.channels[name];
  }
}
