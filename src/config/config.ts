import { GAME_TYPES, FLAGS_ISO_TO_CODE } from '@airbattle/protocol';
import dotenv from 'dotenv';
import { mkdirSync, readFileSync } from 'fs';
import { dirname, isAbsolute, resolve } from 'path';
import { IPv4 } from '@/types';
import { has } from '@/support/objects';
import {
  BOTS_DEFAULT_IP_LIST,
  BOTS_WHITELIST_ENABLED,
  CONNECTIONS_DEFAULT_MAX_PLAYERS_PER_IP,
  METRICS_LOG_INTERVAL_SEC,
  METRICS_LOG_SAMPLES,
  POWERUPS_SPAWN_CHANCE,
  SERVER_DEFAULT_ENVIRONMENT,
  SERVER_DEFAULT_GEO_DB_PATH,
  SERVER_DEFAULT_HOST,
  SERVER_DEFAULT_LOG_LEVEL,
  SERVER_DEFAULT_LOG_TO_CONSOLE,
  SERVER_DEFAULT_PORT,
  SERVER_DEFAULT_PROWLERS_ALWAYS_VISIBLE_FOR_TEAMMATES,
  SERVER_DEFAULT_ROOM,
  SERVER_DEFAULT_SCALE_FACTOR,
  SERVER_DEFAULT_SU_PASSWORD,
  SERVER_DEFAULT_TLS,
  SERVER_DEFAULT_TYPE,
  UPGRADES_DEFAULT_MAX_CHANCE,
  UPGRADES_DEFAULT_MIN_CHANCE,
  BOTS_SERVER_BOT_FLAG,
  BOTS_SERVER_BOT_NAME,
  PLAYERS_ALLOW_NON_ASCII_USERNAMES,
} from '@/constants';

export interface GameServerConfigInterface {
  /**
   * Environment.
   */
  env: string;

  /**
   * .env parsing status.
   */
  dotEnv: boolean;

  cwd: string;

  /**
   * Game server root directory.
   */
  rootDir: string;

  /**
   * Server host/IP.
   */
  host: string;

  /**
   * Server port.
   */
  port: number;

  /**
   * Use TLS
   */
  tls: boolean;
  certs: {
    path: string;
  };

  logs: {
    level: string;

    /**
     * Path to log file.
     */
    path: string;

    /**
     * Log to console.
     */
    console: boolean;

    /**
     * Log performance samples.
     */
    samples: boolean;
  };

  cache: {
    path: string;
  };

  server: {
    typeId: number;

    /**
     * Server type: FFA, CTF, BTR.
     */
    type: string;

    /**
     * Server room name.
     */
    room: string;

    /**
     * Server zoom. Available values: `SERVER_SCALE_FACTOR_VALID_VALUE`.
     */
    scaleFactor: number;
  };

  /**
   * Server info bot.
   */
  bot: {
    name: string;

    flag: string;

    flagId: number;
  };

  /**
   * Master server. Inactive currently.
   */
  master: {
    host: string;
    secret: string;
    tls: boolean;
  };

  /**
   * Maxmind DB.
   */
  geoBasePath: string;

  /**
   * How often metrics collect data, in seconds.
   */
  metricsInterval: number;

  /**
   * Enable whitelist.
   * If disabled (false) every player is considered as bot.
   * Bots have no limits, use only during development.
   */
  whitelist: boolean;

  botsIP: IPv4[];

  /**
   * Admin password.
   */
  suPassword: string;

  /**
   * Random shields and infernos default spawn chance [0..1].
   */
  powerupSpawnChance: number;

  /**
   * Upgrades min chance to drop.
   */
  upgradesDropMinChance: number;

  /**
   * Upgrades max chance to drop.
   * >= upgradesDropMinChance
   *
   * Set min = 0 and max = 0 to disable upgrades drop.
   */
  upgradesDropMaxChance: number;

  /**
   * If true prowlers are always visible for teammates.
   */
  visibleTeamProwlers: boolean;

  allowNonAsciiUsernames: boolean;

  maxPlayersPerIP: number;

  /**
   * Server version.
   */
  version: string;
}

const appRootDir = resolve(__dirname, '../');

const { version } = JSON.parse(readFileSync(`${appRootDir}/../package.json`, 'utf8'));
const dotEnvLoadResult = dotenv.config();

/**
 * Resolve full path
 * @param path absolute or relative path to the file or directory
 * @param root
 */
const resolvePath = (path: string, root = appRootDir): string => {
  if (isAbsolute(path)) {
    return path;
  }

  return resolve(root, path);
};

/**
 * Parse environment boolean value
 * @param value raw value
 * @param def default value
 */
const boolValue = (value: string | undefined, def = false): boolean => {
  return value ? value.toLowerCase() === 'true' : def;
};

/**
 * Parse environment integer value
 * @param value raw value
 * @param def default value
 */
const intValue = (value: string | undefined, def: number): number => {
  return ~~(value || def);
};

/**
 * Parse environment float value
 * @param value raw value
 * @param def default value
 */
const floatValue = (value: string | undefined, def: number): number => {
  return value ? parseFloat(value) : def;
};

/**
 * Parse environment string value
 * @param value raw value
 * @param def default value
 */
const strValue = (value: string | undefined, def = ''): string => {
  return value || def;
};

const parseBotsIP = (value: string | undefined, def: IPv4[]): IPv4[] => {
  if (typeof value === 'string' && value.length > 0) {
    return value.split(',');
  }

  return def;
};

let logsPath = process.env.LOG_FILE || '';

if (typeof process.env.LOG_FILE === 'string' && process.env.LOG_FILE.length === 0) {
  logsPath = '';
} else {
  logsPath = resolvePath(strValue(process.env.LOG_FILE, '../logs/airbattle.log'));
}

const config: GameServerConfigInterface = {
  env: strValue(process.env.NODE_ENV, SERVER_DEFAULT_ENVIRONMENT),
  dotEnv: !dotEnvLoadResult.error,

  cwd: process.cwd(),
  rootDir: appRootDir,

  host: strValue(process.env.HOST, SERVER_DEFAULT_HOST),
  port: intValue(process.env.PORT, SERVER_DEFAULT_PORT),

  tls: boolValue(process.env.ENDPOINTS_TLS, SERVER_DEFAULT_TLS),
  certs: {
    path: resolvePath(strValue(process.env.CERTS_PATH, '../certs')),
  },

  logs: {
    level: strValue(process.env.LOG_LEVEL, SERVER_DEFAULT_LOG_LEVEL),
    path: logsPath,
    console: boolValue(process.env.LOG_TO_CONSOLE, SERVER_DEFAULT_LOG_TO_CONSOLE),
    samples: boolValue(process.env.LOG_PERFORMANCE_SAMPLES, METRICS_LOG_SAMPLES),
  },

  cache: {
    path: resolvePath(strValue(process.env.CACHE_PATH, '../cache')),
  },

  server: {
    typeId: 0,
    type: strValue(process.env.SERVER_TYPE, SERVER_DEFAULT_TYPE),
    room: strValue(process.env.SERVER_ROOM, SERVER_DEFAULT_ROOM),
    scaleFactor: intValue(process.env.SCALE_FACTOR, SERVER_DEFAULT_SCALE_FACTOR),
  },

  bot: {
    name: strValue(process.env.SERVER_BOT_NAME, BOTS_SERVER_BOT_NAME),
    flag: strValue(process.env.SERVER_BOT_FLAG, BOTS_SERVER_BOT_FLAG),
    flagId: 0,
  },

  master: {
    host: strValue(process.env.MASTER_HOST),
    secret: strValue(process.env.MASTER_SECRET),
    tls: boolValue(process.env.MASTER_TLS, false),
  },

  geoBasePath: resolvePath(SERVER_DEFAULT_GEO_DB_PATH),

  metricsInterval: METRICS_LOG_INTERVAL_SEC,

  whitelist: boolValue(process.env.WHITELIST_ENABLED, BOTS_WHITELIST_ENABLED),

  botsIP: parseBotsIP(process.env.BOTS_IP, BOTS_DEFAULT_IP_LIST),

  suPassword: strValue(process.env.SU_PASSWORD, SERVER_DEFAULT_SU_PASSWORD),

  powerupSpawnChance: floatValue(process.env.POWERUPS_SPAWN_CHANCE, POWERUPS_SPAWN_CHANCE),

  upgradesDropMinChance: floatValue(
    process.env.UPGRADES_DROP_MIN_CHANCE,
    UPGRADES_DEFAULT_MIN_CHANCE
  ),

  upgradesDropMaxChance: floatValue(
    process.env.UPGRADES_DROP_MAX_CHANCE,
    UPGRADES_DEFAULT_MAX_CHANCE
  ),

  visibleTeamProwlers: boolValue(
    process.env.PROWLERS_ALWAYS_VISIBLE_FOR_TEAMMATES,
    SERVER_DEFAULT_PROWLERS_ALWAYS_VISIBLE_FOR_TEAMMATES
  ),

  allowNonAsciiUsernames: boolValue(
    process.env.ALLOW_NON_ASCII_USERNAMES,
    PLAYERS_ALLOW_NON_ASCII_USERNAMES
  ),

  maxPlayersPerIP: intValue(process.env.MAX_PLAYERS_PER_IP, CONNECTIONS_DEFAULT_MAX_PLAYERS_PER_IP),

  version,
};

config.server.type = config.server.type.toLocaleUpperCase();

if (has(GAME_TYPES, config.server.type)) {
  config.server.typeId = GAME_TYPES[config.server.type];
} else {
  config.server.typeId = -1;
}

config.bot.flag = config.bot.flag.toLocaleUpperCase();

if (!has(FLAGS_ISO_TO_CODE, config.bot.flag)) {
  config.bot.flag = BOTS_SERVER_BOT_FLAG;
}

config.bot.flagId = FLAGS_ISO_TO_CODE[config.bot.flag];

if (config.bot.name.length === 0 || config.bot.name.length > 20) {
  config.bot.name = BOTS_SERVER_BOT_NAME;
}

mkdirSync(config.certs.path, { recursive: true });
mkdirSync(dirname(config.logs.path), { recursive: true });
mkdirSync(config.cache.path, { recursive: true });

export default config;
