import { SERVER_PACKETS } from '@airbattle/protocol';
import {
  CONNECTIONS_SEND_PACKETS,
  SYNC_ENQUEUE_UPDATE,
  SYNC_SUBSCRIBE,
  SYNC_UNSUBSCRIBE,
} from '../../events';
import { SyncDataUpdate, Timestamp } from '../../types';
import { System } from '../system';
import { OBJECT_TYPE_ID_FIELD_SEPARATOR } from '../../constants';

export default class GameSync extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [SYNC_ENQUEUE_UPDATE]: this.onEnqueueUpdate,
      [SYNC_SUBSCRIBE]: this.onSubscribe,
      [SYNC_UNSUBSCRIBE]: this.onUnsubscribe,
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
      meta: {
        stateChangeTime: Date.now(),
        lastAckResult: null,
        sendCount: 0,
      },
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

  onSubscribe(type: string, id: string): void {
    const { sync } = this.storage;
    const combinedObjectTypeId = [type, id].join(OBJECT_TYPE_ID_FIELD_SEPARATOR);
    const isSubscribed = sync.subscribedObjects.has(combinedObjectTypeId);

    if (!isSubscribed) {
      sync.subscribedObjects.add(combinedObjectTypeId);

      if (sync.active) {
        this.emit(
          CONNECTIONS_SEND_PACKETS,
          {
            c: SERVER_PACKETS.SYNC_SUBSCRIBE,
            active: true,
            type,
            id,
          },
          sync.connectionId
        );
      }
    }
  }

  onUnsubscribe(type: string, id: string): void {
    const { sync } = this.storage;
    const combinedObjectTypeId = [type, id].join(OBJECT_TYPE_ID_FIELD_SEPARATOR);
    const isSubscribed = sync.subscribedObjects.has(combinedObjectTypeId);

    if (isSubscribed) {
      sync.subscribedObjects.delete(combinedObjectTypeId);

      if (sync.active) {
        this.emit(
          CONNECTIONS_SEND_PACKETS,
          {
            c: SERVER_PACKETS.SYNC_SUBSCRIBE,
            active: false,
            type,
            id,
          },
          sync.connectionId
        );
      }
    }
  }
}
