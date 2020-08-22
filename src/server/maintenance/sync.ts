import { SYNC_ENQUEUE_UPDATE } from '../../events';
import { SyncDataUpdate, Timestamp } from '../../types';
import { System } from '../system';

export default class GameSync extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [SYNC_ENQUEUE_UPDATE]: this.onEnqueueUpdate,
    };
  }

  onEnqueueUpdate(
    type: string,
    id: string,
    data: object,
    timestamp: Timestamp,
    event: object
  ): void {
    const { sync } = this.storage;
    const update: SyncDataUpdate = {
      type,
      id,
      data: JSON.stringify(data),
      timestamp,
      event: JSON.stringify(event),
    };

    this.log.debug('Enqueue sync update: %o', update);

    if (sync.active) {
      /**
       * If we have an initialized sync connection, next sequence id is valid, so can be assigned to update.
       */
      const sequence = sync.nextSequenceId;

      sync.nextSequenceId += 1;
      sync.updatesAwaitingSend.set(sequence, update);

      this.log.debug('Sync update %d added to send queue', sequence);
    } else {
      /**
       * Otherwise, add to updates awaiting sequence id assignment.
       */
      sync.updatesAwaitingSequenceId.push(update);

      this.log.debug('Sync update added to sequence id assignment queue');
    }
  }
}
