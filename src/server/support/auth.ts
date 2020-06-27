import { createPublicKey, KeyObject } from 'crypto';
import https from 'https';
import { AUTH_LOGIN_SERVER_DOWNLOAD_RETRY_INTERVAL_MS } from '../../constants';
import { TIMELINE_BEFORE_GAME_START } from '../../events';
import { System } from '../system';

export default class LoginPublicKeyDownloader extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [TIMELINE_BEFORE_GAME_START]: this.downloadLoginServerPublicKey,
    };
  }

  downloadLoginServerPublicKey(): void {
    if (this.config.accounts.active) {
      this.log.info(
        `Initiating login server public key download from ${this.config.accounts.loginKeyServer}.`
      );
    } else {
      this.log.info('User accounts are disabled.');

      return;
    }

    https.get(this.config.accounts.loginKeyServer, res => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        this.storage.loginPublicKey = this.extractAndCreatePublicKey(data);

        if (this.storage.loginPublicKey === null) {
          this.log.error('Could not retrieve public key from login server, will retry.');

          setTimeout(() => {
            this.downloadLoginServerPublicKey();
          }, AUTH_LOGIN_SERVER_DOWNLOAD_RETRY_INTERVAL_MS);
        } else {
          this.log.info('Login server public key download successful.');
        }
      });
    });
  }

  extractAndCreatePublicKey(data: string): KeyObject {
    let json: { key: string };
    let key: KeyObject;

    try {
      json = JSON.parse(data);
    } catch (err) {
      this.log.error('Error parsing key data: %o', { error: err.stack });

      return null;
    }

    try {
      key = createPublicKey({
        key: Buffer.from(json.key, 'base64'),
        format: 'der',
        type: 'spki',
      });
    } catch (err) {
      this.log.error('Error creating public key: %o', { error: err.stack });

      return null;
    }

    return key;
  }
}
