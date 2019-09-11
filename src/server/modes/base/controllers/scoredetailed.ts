import { System } from '@/server/system';
import { ROUTE_SCOREDETAILED, RESPONSE_SCORE_DETAILED } from '@/events';
import { MainConnectionId } from '@/types';

export default class ScoredetailedMessageHandler extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [ROUTE_SCOREDETAILED]: this.onMessageReceived,
    };
  }

  /**
   * Handle `Scoredetailed` request
   *
   * @param connectionId player connection id
   */
  onMessageReceived(connectionId: MainConnectionId): void {
    this.emit(RESPONSE_SCORE_DETAILED, connectionId);
  }
}
