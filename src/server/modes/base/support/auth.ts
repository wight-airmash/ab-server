import crypto, { KeyObject } from 'crypto';
import https from 'https';
import {
  AUTH_LOGIN_SERVER_KEY_URL,
  AUTH_LOGIN_SERVER_DOWNLOAD_RETRY_INTERVAL_SEC,
} from '@/constants';
import { TIMELINE_BEFORE_GAME_START } from '@/events';
import { System } from '@/server/system';

export default class LoginPublicKeyDownloader extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [TIMELINE_BEFORE_GAME_START]: this.downloadLoginServerPublicKey,
    };
  }

  downloadLoginServerPublicKey(): void {
    this.log.info('Initiating login server public key download');

    https.get(AUTH_LOGIN_SERVER_KEY_URL, res => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        this.storage.loginPublicKey = this.extractAndCreatePublicKey(data);

        if (this.storage.loginPublicKey == null) {
          this.log.error('Could not retrieve public key from login server, will retry');
          setTimeout(
            this.downloadLoginServerPublicKey,
            AUTH_LOGIN_SERVER_DOWNLOAD_RETRY_INTERVAL_SEC
          );
        } else {
          this.log.info('Login server public key download successful');
        }
      });
    });
  }

  extractAndCreatePublicKey(data: string): KeyObject {
    let json;
    let key: KeyObject;

    try {
      json = JSON.parse(data);
    } catch (e) {
      this.log.debug('Error parsing key data');

      return null;
    }

    try {
      key = crypto.createPublicKey({
        key: Buffer.from(json.key, 'base64'),
        format: 'der',
        type: 'spki',
      });
    } catch (e) {
      this.log.debug('Error creating public key');

      return null;
    }

    return key;
  }
}
