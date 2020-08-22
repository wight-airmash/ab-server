import { SERVER_PACKETS } from '@airbattle/protocol';
import { CONNECTIONS_SEND_PACKETS, TIMELINE_LOOP_TICK } from '../../events';
import { System } from '../system';

export default class SyncUpdatePeriodic extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [TIMELINE_LOOP_TICK]: this.sendUpdates,
    };
  }

  sendUpdates(): void {
    /**
     * Only process update queues if we have an initialized sync connection.
     */
    if (this.storage.sync.active) {
      /**
       * Updates waiting for sequence id.
       */
      while (this.storage.sync.updatesAwaitingSequenceId.length > 0) {
        const sequence = this.storage.sync.nextSequenceId;
        const update = this.storage.sync.updatesAwaitingSequenceId[0];

        this.storage.sync.nextSequenceId += 1;

        this.log.debug('Assigned sequence id %d to sync update %o', sequence, update);

        /**
         * Add to updates awaiting send.
         */
        this.storage.sync.updatesAwaitingSend.set(sequence, update);

        /**
         * Remove from updates awaiting sequence id.
         */
        this.storage.sync.updatesAwaitingSequenceId.shift();
      }

      /**
       * Updates waiting for send.
       */
      this.storage.sync.updatesAwaitingSend.forEach((update, sequence) => {
        this.log.debug('Sending sync update %d: %o', sequence, update);

        /**
         * Send update to sync service.
         */
        this.emit(
          CONNECTIONS_SEND_PACKETS,
          {
            c: SERVER_PACKETS.SYNC_UPDATE,
            sequence,
            type: update.type,
            id: update.id,
            data: update.data,
            timestamp: update.timestamp,
            event: update.event,
          },
          this.storage.syncConnectionId
        );

        this.log.debug('Moving sync update %d to await acknowledgement', sequence);

        /**
         * Add to updates awaiting acknowledgement.
         */
        this.storage.sync.updatesAwaitingAck.set(sequence, update);

        /**
         * Remove from updates awaiting send.
         */
        this.storage.sync.updatesAwaitingSend.delete(sequence);
      });
    }
  }
}
