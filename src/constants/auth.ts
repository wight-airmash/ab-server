import { MS_PER_SEC } from './units';

/**
 * Used to obtain public key on server startup, so user token on login can be verified.
 */
export const AUTH_LOGIN_SERVER_KEY_URL = 'https://login.airmash.online/key';

export const AUTH_LOGIN_SERVER_DOWNLOAD_RETRY_INTERVAL_SEC = 5;

export const AUTH_LOGIN_SERVER_DOWNLOAD_RETRY_INTERVAL_MS =
  AUTH_LOGIN_SERVER_DOWNLOAD_RETRY_INTERVAL_SEC * MS_PER_SEC;
