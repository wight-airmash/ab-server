import { RESPONSE_SCORE_DETAILED, ROUTE_SCOREDETAILED } from '../../events';
import { MainConnectionId } from '../../types';
import { System } from '../system';

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
