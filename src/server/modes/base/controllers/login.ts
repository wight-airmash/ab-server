import { ClientPackets, FLAGS_ISO_TO_CODE } from '@airbattle/protocol';
import { PLAYERS_DEFAULT_FLAG, SHIPS_TYPES } from '@/constants';
import { CHANNEL_CONNECT_PLAYER } from '@/server/channels';
import {
  PLAYERS_CREATE,
  ERRORS_INCORRECT_PROTOCOL,
  ERRORS_INVALID_LOGIN_DATA,
  PLAYERS_KICK,
  ROUTE_LOGIN,
} from '@/events';
import { System } from '@/server/system';
import { has } from '@/support/objects';
import { MainConnectionId } from '@/types';

export default class LoginMessageHandler extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [ROUTE_LOGIN]: this.onLoginMessageReceived,
    };
  }

  /**
   * Handle `Login` request.
   *
   * @param connectionId player connection id
   * @param msg player packet
   */
  onLoginMessageReceived(connectionId: MainConnectionId, msg: ClientPackets.Login): void {
    if (!this.storage.connectionList.has(connectionId)) {
      return;
    }

    const connection = this.storage.connectionList.get(connectionId);

    if (connection.meta.pending.login === true) {
      return;
    }

    connection.meta.pending.login = true;
    clearTimeout(connection.meta.timeouts.login);

    /**
     * Check if player has already logged in.
     */
    if (connection.meta.playerId !== null) {
      this.log.info('Double login. Connection refused.', {
        connection: connectionId,
      });
      this.emit(PLAYERS_KICK, connection.meta.playerId);

      return;
    }

    /**
     * Mark connection as main.
     */
    connection.meta.isMain = true;

    /**
     * Validation
     */
    const user = false;
    let { flag } = msg;

    if (msg.protocol !== 5) {
      this.emit(ERRORS_INCORRECT_PROTOCOL, connectionId);

      return;
    }

    if (msg.session.length > 0 && msg.session !== 'none') {
      if (!user) {
        this.emit(ERRORS_INVALID_LOGIN_DATA, connectionId);

        return;
      }
    }

    if (msg.name.length > 20) {
      this.emit(ERRORS_INVALID_LOGIN_DATA, connectionId);

      return;
    }

    const country = this.app.geocoder.get(connection.meta.ip);

    if (connection.meta.isBot === true) {
      if (has(FLAGS_ISO_TO_CODE, msg.flag.toUpperCase())) {
        flag = msg.flag.toUpperCase();
      } else {
        flag = PLAYERS_DEFAULT_FLAG;
      }
    } else if (
      has(country, 'country') &&
      has(country.country, 'iso_code') &&
      has(FLAGS_ISO_TO_CODE, country.country.iso_code.toUpperCase())
    ) {
      flag = country.country.iso_code.toUpperCase();
    } else {
      flag = PLAYERS_DEFAULT_FLAG;
    }

    this.channel(CHANNEL_CONNECT_PLAYER).delay(PLAYERS_CREATE, {
      connectionId,
      name: msg.name,
      flag,
      horizon: {
        x: msg.horizonX,
        y: msg.horizonY,
      },
      user,
      shipType: SHIPS_TYPES.PREDATOR,
    });
  }
}
