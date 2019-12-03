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
    let userId: string;
    let { flag, name } = msg;

    if (msg.protocol !== 5) {
      this.emit(ERRORS_INCORRECT_PROTOCOL, connectionId);

      return;
    }

    if (msg.session !== 'none') {
      let validSessionData = true;

      try {
        const session = JSON.parse(msg.session);

        if (session.id) {
          if (typeof session.id === 'string' && /^[0-9a-f]{32}$/im.test(session.id)) {
            userId = session.id;
          } else {
            validSessionData = false;
          }
        }
      } catch (e) {
        validSessionData = false;
      }

      if (!validSessionData) {
        this.emit(ERRORS_INVALID_LOGIN_DATA, connectionId);

        return;
      }
    }

    if (this.app.config.allowNonAsciiUsernames === false) {
      name = name.replace(/[^\x20-\x7E]/g, '');
    }

    name = name.replace(/\s{2,}/g, ' ').trim();

    if (name.length === 0 || name.length > 20 || /^\s+$/.test(name) === true) {
      this.emit(ERRORS_INVALID_LOGIN_DATA, connectionId);

      return;
    }

    if (has(FLAGS_ISO_TO_CODE, msg.flag.toUpperCase())) {
      flag = msg.flag.toUpperCase();
    } else {
      const country = this.app.geocoder.get(connection.meta.ip);

      if (
        has(country, 'country') &&
        has(country.country, 'iso_code') &&
        has(FLAGS_ISO_TO_CODE, country.country.iso_code.toUpperCase())
      ) {
        flag = country.country.iso_code.toUpperCase();
      } else {
        flag = PLAYERS_DEFAULT_FLAG;
      }
    }

    this.channel(CHANNEL_CONNECT_PLAYER).delay(PLAYERS_CREATE, {
      connectionId,
      name,
      flag,
      horizon: {
        x: msg.horizonX,
        y: msg.horizonY,
      },
      userId,
      shipType: SHIPS_TYPES.PREDATOR,
    });
  }
}
