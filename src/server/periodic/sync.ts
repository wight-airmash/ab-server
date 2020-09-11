import { SERVER_PACKETS } from '@airbattle/protocol';
import { CONNECTIONS_SEND_PACKETS, TIMELINE_LOOP_TICK, TIMELINE_CLOCK_SECOND, SYNC_CONNECTION_INACTIVE } from '../../events';
import { System } from '../system';
import { SYNC_ACK_TIMEOUT_MS, SYNC_RESEND_TIMEOUT_MS } from '../../constants';

export default class SyncUpdatePeriodic extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [TIMELINE_LOOP_TICK]: this.sendUpdates,
      [TIMELINE_CLOCK_SECOND]: this.processAckTimeoutsAndResends,
      [SYNC_CONNECTION_INACTIVE]: this.processAckTimeoutsAndResends,
    };
  }

  sendUpdates(): void {
    const { sync } = this.storage;

    /**
     * Only process update queues if we have an initialized sync connection.
     */
    if (sync.active) {
      const now = Date.now();
      let hasChanges = false;

      /**
       * Updates waiting for sequence id.
       */
      while (sync.updatesAwaitingSequenceId.length > 0) {
        const sequence = sync.nextSequenceId;
        const update = sync.updatesAwaitingSequenceId[0];

        sync.nextSequenceId += 1;

        this.log.debug('Assigned sequence id %d to sync update %o', sequence, update);

        /**
         * Add to updates awaiting send.
         */
        update.meta.stateChangeTime = now;
        sync.updatesAwaitingSend.set(sequence, update);

        /**
         * Remove from updates awaiting sequence id.
         */
        sync.updatesAwaitingSequenceId.shift();

        /**
         * Changes made to saveable sync state.
         */
        hasChanges = true;
      }

      /**
       * Updates waiting for send.
       */
      sync.updatesAwaitingSend.forEach((update, sequence) => {
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
          sync.connectionId
        );

        this.log.debug('Moving sync update %d to await acknowledgement', sequence);

        /**
         * Add to updates awaiting acknowledgement.
         */
        update.meta.sendCount += 1;
        update.meta.stateChangeTime = now;
        sync.updatesAwaitingAck.set(sequence, update);

        /**
         * Remove from updates awaiting send.
         */
        sync.updatesAwaitingSend.delete(sequence);

        /**
         * Changes made to saveable sync state.
         */
        hasChanges = true;
      });

      sync.hasChanges = sync.hasChanges || hasChanges;
    }
  }

  processAckTimeoutsAndResends(): void {
    const { sync } = this.storage;
    const now = Date.now();
    let sendHasChanges = false; // changes to sync update send queue
    let syncHasChanges = false; // any other changes to sync state

    if (sync.active) {
      /**
       * Timeout updates awaiting acknowledgement.
       */
      sync.updatesAwaitingAck.forEach((update, sequence) => {
        if (now - update.meta.stateChangeTime > SYNC_ACK_TIMEOUT_MS) {
          this.log.warn('Sync ack for update %d timed out, moving to resend queue', sequence);

          /**
           * Add to updates awaiting resend.
           */
          update.meta.stateChangeTime = now;
          sync.updatesAwaitingResend.set(sequence, update);

          /**
           * Remove from updates awaiting acknowledgement.
           */
          sync.updatesAwaitingAck.delete(sequence);

          /**
           * Changes made to saveable sync state.
           */
          syncHasChanges = true;
        }
      });

      /**
       * Timeout updates awaiting resend.
       */
      sync.updatesAwaitingResend.forEach((update, sequence) => {
        if (now - update.meta.stateChangeTime > SYNC_RESEND_TIMEOUT_MS) {
          this.log.warn(
            'Moving sync update %d to send queue, for retry %d',
            sequence,
            update.meta.sendCount
          );

          /**
           * Add to updates awaiting send.
           */
          update.meta.stateChangeTime = now;
          sync.updatesAwaitingSend.set(sequence, update);
          sendHasChanges = true;

          /**
           * Remove from updates awaiting resend.
           */
          sync.updatesAwaitingResend.delete(sequence);

          /**
           * Changes made to saveable sync state.
           */
          syncHasChanges = true;
        }
      });
    } else {
      /**
       * As connection is down, cancel any timeouts.
       *
       * That is, set any updates awaiting acknowledgement or resend to send when connection next active.
       */
      sync.updatesAwaitingAck.forEach((update, sequence) => {
        /**
         * Add to updates awaiting send.
         */
        update.meta.stateChangeTime = now;
        sync.updatesAwaitingSend.set(sequence, update);
        sendHasChanges = true;

        /**
         * Remove from updates awaiting acknowledgement.
         */
        sync.updatesAwaitingAck.delete(sequence);
      });

      sync.updatesAwaitingResend.forEach((update, sequence) => {
        /**
         * Add to updates awaiting send.
         */
        update.meta.stateChangeTime = now;
        sync.updatesAwaitingSend.set(sequence, update);
        sendHasChanges = true;

        /**
         * Remove from updates awaiting resend.
         */
        sync.updatesAwaitingResend.delete(sequence);
      });
    }

    if (sendHasChanges) {
      /**
       * Reorder updates awaiting send by sequence id.
       */
      sync.updatesAwaitingSend = new Map(
        [...sync.updatesAwaitingSend.entries()].sort((a, b) => a[0] - b[0])
      );
    }

    sync.hasChanges = sync.hasChanges || syncHasChanges || sendHasChanges;
  }
}
