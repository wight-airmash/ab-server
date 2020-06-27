import { parentPort, isMainThread } from 'worker_threads';
import EventEmitter from 'eventemitter3';

/**
 * Worker events hub.
 */
class WorkerHub {
  /**
   * EventEmitter for messaging inside the worker.
   */
  public events: EventEmitter;

  constructor() {
    if (!isMainThread) {
      this.events = new EventEmitter();

      /**
       * Subscribe to main thread events and re-emit inside the worker.
       */
      parentPort.on('message', msg => {
        this.events.emit(msg.event, ...msg.args);
      });
    }
  }

  /**
   * Emit event to the main thread.
   *
   * @param event
   * @param args
   */
  static emitToMain(event: string, ...args: any[]): void {
    parentPort.postMessage({
      event,
      args,
    });
  }
}

const hub = new WorkerHub();

export { WorkerHub as Hub, hub };
