import {
  NS_PER_SEC,
  MAX_UINT16,
  SECONDS_PER_MINUTE,
  MINUTES_PER_HOUR,
  HOURS_PER_DAY,
} from './units';

export const SERVER_FPS = 60;

/**
 * Max value of the counter before reset.
 * In theory it's Math.floor(Number.MAX_SAFE_INTEGER / SERVER_LOOP_INTERVAL_NS).
 *
 * 60 frames * 60 seconds * 60 minutes * 24 hours * 100 days.
 */
export const SERVER_FRAMES_COUNTER_LIMIT =
  SERVER_FPS * SECONDS_PER_MINUTE * MINUTES_PER_HOUR * HOURS_PER_DAY * 100;

export const SERVER_LOOP_INTERVAL_NS = Math.ceil((1 / SERVER_FPS) * NS_PER_SEC);

export const MIN_SAFE_TICKER_INTERVAL_NS = 1000;

export const SERVER_DEFAULT_ENVIRONMENT = 'production';

export const SERVER_DEFAULT_HOST = '0.0.0.0';

export const SERVER_DEFAULT_PORT = 3501;

export const SERVER_DEFAULT_PATH = '/';

export const SERVER_DEFAULT_TLS = false;

export const SERVER_DEFAULT_LOG_LEVEL = 'info';

export const SERVER_DEFAULT_LOG_TO_CONSOLE = false;

export const SERVER_DEFAULT_TYPE = 'ffa';

export const SERVER_DEFAULT_ROOM = 'ab-ffa';

export const SERVER_DEFAULT_GEO_DB_PATH = '../data/GeoLite2-Country.mmdb';

export const SERVER_DEFAULT_SU_PASSWORD = '';

export const SERVER_DEFAULT_SCALE_FACTOR = 5500;

export const SERVER_SCALE_FACTOR_VALID_VALUES = [
  2000,
  2500,
  3000,
  3500,
  4000,
  4500,
  5000,
  5500,
  6000,
];

/**
 * Max player screen ratio.
 * For values greater than this, the visible area will be cropped.
 */
export const SERVER_MAX_VIEWPORT_RATIO = 5;

/**
 * The enabled visibility allows to cheat in CTF. The player
 * can connect from the second browser window for another team
 * and enter the spectate mode in order to observe prowler.
 * Leave it off (false) to prevent this cheating method.
 */
export const SERVER_DEFAULT_PROWLERS_ALWAYS_VISIBLE_FOR_TEAMMATES = false;

/**
 * Max online players
 */
export const SERVER_MAX_PLAYERS_LIMIT = 100;

/**
 * Bounce events won't be processed often than this value.
 */
export const SERVER_BOUNCE_DELAY_MS = Math.ceil((1000 / 60) * 2);

/**
 * Min airplane speed after bounce.
 */
export const SERVER_BOUNCE_MIN_SPEED = 1;

/**
 * Values less than are reserved (not used right now).
 * IDs from SERVER_MIN_SERVICE_MOB_ID to SERVER_MIN_MOB_ID
 * are for service use (like mountains entities, flags, etc.).
 */
export const SERVER_MIN_SERVICE_MOB_ID = 128;

export const SERVER_MIN_MOB_ID = 1024;

export const SERVER_MAX_MOB_ID = MAX_UINT16 - 128;

export const SERVER_BROADCAST_SCORE_BOARD_INTERVAL_TICKS = 5 * SERVER_FPS;

export const SERVER_MODERATION_PANEL = true;

export const SERVER_MODERATION_PANEL_URL_ROUTE = 'admin';

export const SERVER_WELCOME_MESSAGES = [];

export const SERVER_WELCOME_MESSAGES_DELIMITER = '%split%';
