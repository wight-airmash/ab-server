import EventEmitter from 'eventemitter3';
import Logger from '../logger';

export class EventChannel {
  /**
   * FIFO delayed events queue.
   */
  public events: [string | symbol, any][] = [];

  protected emitter: EventEmitter;

  protected log: Logger;

  constructor({ eventEmitter, log }: { eventEmitter: EventEmitter; log: Logger }) {
    this.emitter = eventEmitter;
    this.log = log;
  }

  delay(event: string | symbol, ...args: any[]): void {
    this.events.push([event, args]);
  }

  /**
   * Emit first delayed event.
   */
  emitFirstDelayed(): void {
    if (this.events.length !== 0) {
      const [event, args] = this.events.shift();

      try {
        this.emitter.emit(event, ...args);
      } catch (err) {
        this.log.error('First delayed event emit error: %o', {
          event,
          error: err.stack,
        });
      }
    }
  }

  /**
   * Emit all delayed events.
   */
  emitDelayed(): void {
    let index = 0;

    while (index !== this.events.length) {
      const [event, args] = this.events[index];

      try {
        this.emitter.emit(event, ...args);
      } catch (err) {
        this.log.error('Delayed event emit error: %o', {
          event,
          error: err.stack,
        });
      }

      index += 1;
    }

    this.events = [];
  }
}
