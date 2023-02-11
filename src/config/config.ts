import { mkdirSync, readFileSync } from 'fs';
import { dirname, isAbsolute, resolve } from 'path';
import { FLAGS_ISO_TO_CODE, GAME_TYPES } from '@airbattle/protocol';
import dotenv from 'dotenv';
import {
  AUTH_LOGIN_SERVER_KEY_URL,
  BOTS_DEFAULT_IP_LIST,
  BOTS_DEFAULT_NAME_PREFIX,
  BOTS_IP_LIST_ENABLED,
  BOTS_SERVER_BOT_FLAG,
  BOTS_SERVER_BOT_NAME,
  BTR_DEFAULT_FIREWALL_SPEED,
  BTR_DEFAULT_MATCH_WAIT_TIME,
  CONNECTIONS_DEFAULT_MAX_PLAYERS_PER_IP,
  CONNECTIONS_FLOODING_AUTOBAN,
  CONNECTIONS_INVALID_PROTOCOL_AUTOKICK,
  CONNECTIONS_WEBSOCKETS_COMPRESSION,
  CTF_BASE_SHIELD_RANDOM_INTERVAL_SEC,
  CTF_EXTRA_SPAWNS,
  CTF_QBOTS_FEATURES,
  FFA_DEFAULT_SPAWN_ZONE,
  FFA_VALID_SPAWN_ZONES,
  LIMITS_ANY,
  LIMITS_CHAT,
  LIMITS_CHAT_DECREASE_WEIGHT,
  LIMITS_KEY,
  LIMITS_SAY,
  METRICS_LOG_INTERVAL_SEC,
  METRICS_LOG_SAMPLES,
  MS_PER_SEC,
  PLAYERS_ALLOW_NON_ASCII_USERNAMES,
  PLAYERS_KILL_ASSISTS,
  POWERUPS_SPAWN_CHANCE,
  POWERUPS_SPAWN_LIMIT,
  SERVER_DEFAULT_ENVIRONMENT,
  SERVER_DEFAULT_GEO_DB_PATH,
  SERVER_DEFAULT_HOST,
  SERVER_DEFAULT_LOG_LEVEL,
  SERVER_DEFAULT_LOG_TO_CONSOLE,
  SERVER_DEFAULT_PATH,
  SERVER_DEFAULT_PORT,
  SERVER_DEFAULT_PROWLERS_ALWAYS_VISIBLE_FOR_TEAMMATES,
  SERVER_DEFAULT_ROOM,
  SERVER_DEFAULT_SCALE_FACTOR,
  SERVER_DEFAULT_SU_PASSWORD,
  SERVER_DEFAULT_TLS,
  SERVER_DEFAULT_TYPE,
  SERVER_MODERATION_PANEL,
  SERVER_MODERATION_PANEL_URL_ROUTE,
  SERVER_WELCOME_MESSAGES,
  SERVER_WELCOME_MESSAGES_DELIMITER,
  UPGRADES_DEFAULT_MAX_CHANCE,
  UPGRADES_DEFAULT_MIN_CHANCE,
  USER_ACCOUNTS,
} from '../constants';
import { has } from '../support/objects';
import { IPv4 } from '../types';

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

  server: {
    typeId: number;

    /**
     * Server base version.
     */
    version: string;

    /**
     * Version variation.
     */
    edition: string;

    /**
     * Server host/IP.
     */
    host: string;

    /**
     * Server port.
     */
    port: number;

    /**
     * Server URL path.
     */
    basePath: string;

    /**
     * Use TLS.
     */
    tls: boolean;
    certs: {
      path: string;
    };

    /**
     * Use compression for websockets.
     */
    compression: boolean;

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

    /**
     * Server info bot.
     */
    bot: {
      name: string;

      flag: string;

      flagId: number;

      /**
       * Welcome messages.
       */
      welcome: string[];
    };
  };

  chat: {
    votemutePercentile: number;
    votemuteDuration: number;
  };

  logs: {
    level: string;

    /**
     * Path to the log file.
     */
    path: string;

    /**
     * Path to the public chat log file.
     */
    chat: string;

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

  connections: {
    maxPlayersPerIP: number;

    /**
     * Leaky buckets parameters.
     */
    packetLimits: {
      any: number;
      key: number;
      chat: number;
      chatLeak: number;
      say: number;
    };

    /**
     * Permit automatic kicks based on invalid protocol implementation.
     */
    invalidProtocolAutoKick: {
      ack: boolean;
      pong: boolean;
      backup: boolean;
    };

    /**
     * Permit automatic bans based on network events (i.e. packet flooding).
     */
    autoBan: boolean;

    /**
     * AFK disconnect timeout in minutes.
     */
    afkDisconnectTimeout: number;
  };

  accounts: {
    /**
     * Allow players to use accounts.
     */
    active: boolean;

    /**
     * URL of the public key server.
     */
    loginKeyServer: string;

    /**
     * User stats DB.
     */
    userStats: {
      path: string;
    };
  };

  sync: {
    /**
     * Synchronize data with other game servers.
     */
    enabled: boolean;

    /**
     * Path for persisting sync state.
     */
    state: {
      path: string;
    };
  };

  admin: {
    active: boolean;
    route: string;
    htmlPath: string;
    passwordsPath: string;
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
   * Admin password.
   */
  suPassword: string;

  powerups: {
    /**
     * Random shields and infernos spawn chance [0..1].
     */
    chance: number;

    /**
     *
     * Sets the maximum number of spawn events
     * per minute (predefined powerups are not affected).
     * Defined as a percentage of the total amount of chunks, [0..1].
     */
    limit: number;
  };

  upgrades: {
    /**
     * Upgrades min chance to drop.
     */
    minChance: number;

    /**
     * Upgrades max chance to drop.
     * >= upgradesDropMinChance
     *
     * Set min = 0 and max = 0 to disable upgrades drop.
     */
    maxChance: number;

    /**
     * Fever indicates all users respawn with full boosts
     */
    fever: {
      active: boolean;
      auto: boolean;
    };
  };

  /**
   * If true prowlers are always visible for teammates.
   */
  visibleTeamProwlers: boolean;

  allowNonAsciiUsernames: boolean;

  /**
   * Track assistance in killing.
   */
  killAssists: boolean;

  ctf: {
    /**
     * Enable special CTF Q-bots features.
     */
    qBotsFeatures: boolean;

    /**
     * Randomize periodic base shields.
     */
    randomBaseShieldInterval: number;

    /**
     * Enable extra middle-map spawns.
     */
    extraSpawns: boolean;
  };

  ffa: {
    /**
     * Support alternative spawn zones at runtime.
     * The provided string maps to an enumerated set of valid ffa spawn zones.
     * If the string matches an available spawn zones, spawn events will take place in that zone.
     * Otherwise, they will occur in the default EU spawn zone.
     */
    spawnZoneName: string;

    /**
     * Add periodic CTF-like base infernos.
     */
    baseInfernos: boolean;
  };

  btr: {
    /**
     * Speed of firewall as it moves toward the centre of the map.
     */
    firewallSpeed: number;

    /**
     * Wait time between matches.
     */
    matchWaitTime: number;
  };

  bots: {
    /**
     * Enable or disable allowed IP list.
     * Bots have less restrictions and don't have an access to the server bot.
     */
    enabled: boolean;

    /**
     * Allowed IP list.
     */
    ipList: IPv4[];

    /**
     * Auto add prefix to the bot name.
     */
    prefix: string;
  };
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

const parseWelcomeMessages = (value: string | undefined, def: string[]): string[] => {
  if (typeof value === 'string' && value.length > 0) {
    return value.split(SERVER_WELCOME_MESSAGES_DELIMITER);
  }

  return def;
};

const parseServerPath = (value: string | undefined, def = '/'): string => {
  let result = def;

  if (typeof value === 'string' && value.length > 0) {
    const parts = value.split('/');
    const validParts = parts.filter(part => part !== '');

    result = `/${validParts.join('/')}`;
  }

  if (result === '/') {
    return '';
  }

  return result;
};

let logsPath = process.env.LOG_FILE || '';
let chatLogsPath = process.env.LOG_CHAT_FILE || '';

if (typeof process.env.LOG_FILE === 'string' && process.env.LOG_FILE.length === 0) {
  logsPath = '';
} else {
  logsPath = resolvePath(strValue(process.env.LOG_FILE, '../logs/airbattle.log'));
}

if (typeof process.env.LOG_CHAT_FILE === 'string' && process.env.LOG_CHAT_FILE.length === 0) {
  chatLogsPath = '';
} else {
  chatLogsPath = resolvePath(strValue(process.env.LOG_CHAT_FILE, '../logs/chat.log'));
}

const config: GameServerConfigInterface = {
  env: strValue(process.env.NODE_ENV, SERVER_DEFAULT_ENVIRONMENT),
  dotEnv: !dotEnvLoadResult.error,

  cwd: process.cwd(),
  rootDir: appRootDir,

  server: {
    typeId: 0,

    version,
    edition: strValue(process.env.SERVER_EDITION, 'main'),

    host: strValue(process.env.HOST, SERVER_DEFAULT_HOST),
    port: intValue(process.env.PORT, SERVER_DEFAULT_PORT),
    basePath: parseServerPath(process.env.BASE_PATH, SERVER_DEFAULT_PATH),

    compression: boolValue(process.env.WEBSOCKETS_COMPRESSION, CONNECTIONS_WEBSOCKETS_COMPRESSION),

    tls: boolValue(process.env.ENDPOINTS_TLS, SERVER_DEFAULT_TLS),

    certs: {
      path: resolvePath(strValue(process.env.CERTS_PATH, '../certs')),
    },

    type: strValue(process.env.SERVER_TYPE, SERVER_DEFAULT_TYPE),
    room: strValue(process.env.SERVER_ROOM, SERVER_DEFAULT_ROOM),
    scaleFactor: intValue(process.env.SCALE_FACTOR, SERVER_DEFAULT_SCALE_FACTOR),

    bot: {
      name: strValue(process.env.SERVER_BOT_NAME, BOTS_SERVER_BOT_NAME),
      flag: strValue(process.env.SERVER_BOT_FLAG, BOTS_SERVER_BOT_FLAG),

      flagId: 0,
      welcome: parseWelcomeMessages(process.env.WELCOME_MESSAGES, SERVER_WELCOME_MESSAGES),
    },
  },

  chat: {
    /**
     * To use /votemute player score must be in the top N-tile of all players.
     * To use /votemute player must play (not spectate, not stay) at least this time duration.
     */
    votemutePercentile: floatValue(process.env.CHAT_MIN_PLAYER_SCORE_TO_VOTEMUTE, 0),
    votemuteDuration: intValue(process.env.CHAT_MIN_PLAYER_PLAYTIME_TO_VOTEMUTE, 60) * MS_PER_SEC,
  },

  logs: {
    level: strValue(process.env.LOG_LEVEL, SERVER_DEFAULT_LOG_LEVEL),
    path: logsPath,
    chat: chatLogsPath,
    console: boolValue(process.env.LOG_TO_CONSOLE, SERVER_DEFAULT_LOG_TO_CONSOLE),
    samples: boolValue(process.env.LOG_PERFORMANCE_SAMPLES, METRICS_LOG_SAMPLES),
  },

  cache: {
    path: resolvePath(strValue(process.env.CACHE_PATH, '../cache')),
  },

  connections: {
    maxPlayersPerIP: intValue(
      process.env.MAX_PLAYERS_PER_IP,
      CONNECTIONS_DEFAULT_MAX_PLAYERS_PER_IP
    ),

    packetLimits: {
      any: intValue(process.env.PACKETS_LIMIT_ANY, LIMITS_ANY),
      key: intValue(process.env.PACKETS_LIMIT_KEY, LIMITS_KEY),
      chat: intValue(process.env.PACKETS_LIMIT_CHAT, LIMITS_CHAT),
      say: intValue(process.env.PACKETS_LIMIT_SAY, LIMITS_SAY),
      chatLeak: intValue(process.env.PACKETS_LIMIT_CHAT_LEAK, LIMITS_CHAT_DECREASE_WEIGHT),
    },

    invalidProtocolAutoKick: {
      ack: boolValue(
        process.env.INVALID_PROTOCOL_AUTOKICK_ACK,
        CONNECTIONS_INVALID_PROTOCOL_AUTOKICK
      ),

      pong: boolValue(
        process.env.INVALID_PROTOCOL_AUTOKICK_PONG,
        CONNECTIONS_INVALID_PROTOCOL_AUTOKICK
      ),

      backup: boolValue(
        process.env.INVALID_PROTOCOL_AUTOKICK_BACKUP,
        CONNECTIONS_INVALID_PROTOCOL_AUTOKICK
      ),
    },

    autoBan: boolValue(process.env.PACKETS_FLOODING_AUTOBAN, CONNECTIONS_FLOODING_AUTOBAN),

    afkDisconnectTimeout: floatValue(process.env.AFK_DISCONNECT_TIMEOUT, undefined),
  },

  accounts: {
    active: boolValue(process.env.USER_ACCOUNTS, USER_ACCOUNTS),
    loginKeyServer: strValue(process.env.AUTH_LOGIN_SERVER_KEY_URL, AUTH_LOGIN_SERVER_KEY_URL),

    userStats: {
      path: resolvePath(strValue(process.env.STATS_PATH, '../data/user-stats.json')),
    },
  },

  sync: {
    enabled: boolValue(process.env.STATS_SYNC, false),

    state: {
      path: resolvePath(strValue(process.env.SYNC_STATE_PATH, '../data/sync-state.json')),
    },
  },

  admin: {
    active: boolValue(process.env.MODERATION_PANEL, SERVER_MODERATION_PANEL),
    route: strValue(process.env.MODERATION_PANEL_URL_ROUTE, SERVER_MODERATION_PANEL_URL_ROUTE),
    htmlPath: resolvePath(strValue(process.env.ADMIN_HTML_PATH, '../admin/admin.html')),
    passwordsPath: resolvePath(
      strValue(process.env.ADMIN_PASSWORDS_PATH, '../admin/passwords.txt')
    ),
  },

  geoBasePath: resolvePath(SERVER_DEFAULT_GEO_DB_PATH),

  metricsInterval: METRICS_LOG_INTERVAL_SEC,

  suPassword: strValue(process.env.SU_PASSWORD, SERVER_DEFAULT_SU_PASSWORD),

  powerups: {
    chance: floatValue(process.env.POWERUPS_SPAWN_CHANCE, POWERUPS_SPAWN_CHANCE),
    limit: floatValue(process.env.POWERUPS_SPAWN_LIMIT, POWERUPS_SPAWN_LIMIT),
  },

  upgrades: {
    minChance: floatValue(process.env.UPGRADES_DROP_MIN_CHANCE, UPGRADES_DEFAULT_MIN_CHANCE),
    maxChance: floatValue(process.env.UPGRADES_DROP_MAX_CHANCE, UPGRADES_DEFAULT_MAX_CHANCE),

    fever: {
      active: false,
      auto: false,
    },
  },

  visibleTeamProwlers: boolValue(
    process.env.PROWLERS_ALWAYS_VISIBLE_FOR_TEAMMATES,
    SERVER_DEFAULT_PROWLERS_ALWAYS_VISIBLE_FOR_TEAMMATES
  ),

  allowNonAsciiUsernames: boolValue(
    process.env.ALLOW_NON_ASCII_USERNAMES,
    PLAYERS_ALLOW_NON_ASCII_USERNAMES
  ),

  killAssists: boolValue(process.env.KILL_ASSISTS, PLAYERS_KILL_ASSISTS),

  bots: {
    enabled: boolValue(process.env.WHITELIST_ENABLED, BOTS_IP_LIST_ENABLED),
    ipList: parseBotsIP(process.env.BOTS_IP, BOTS_DEFAULT_IP_LIST),
    prefix: strValue(process.env.BOTS_NAME_PREFIX, BOTS_DEFAULT_NAME_PREFIX),
  },

  ctf: {
    qBotsFeatures: boolValue(process.env.CTF_QBOTS_FEATURES, CTF_QBOTS_FEATURES),

    randomBaseShieldInterval: intValue(
      process.env.CTF_BASE_SHIELD_RANDOM_INTERVAL,
      CTF_BASE_SHIELD_RANDOM_INTERVAL_SEC
    ),

    extraSpawns: boolValue(process.env.CTF_EXTRA_SPAWNS, CTF_EXTRA_SPAWNS),
  },

  ffa: {
    spawnZoneName: strValue(process.env.FFA_SPAWN_ZONE_NAME, FFA_DEFAULT_SPAWN_ZONE),
    baseInfernos: boolValue(process.env.FFA_BASE_INFERNOS, false),
  },

  btr: {
    firewallSpeed: intValue(process.env.BTR_FIREWALL_SPEED, BTR_DEFAULT_FIREWALL_SPEED),
    matchWaitTime: intValue(process.env.BTR_MATCH_WAIT_TIME, BTR_DEFAULT_MATCH_WAIT_TIME),
  },
};

config.server.type = config.server.type.toLocaleUpperCase();

if (has(GAME_TYPES, config.server.type)) {
  config.server.typeId = GAME_TYPES[config.server.type];
} else {
  config.server.typeId = -1;
}

config.server.bot.flag = config.server.bot.flag.toLocaleUpperCase();

if (!has(FLAGS_ISO_TO_CODE, config.server.bot.flag)) {
  config.server.bot.flag = BOTS_SERVER_BOT_FLAG;
}

config.server.bot.flagId = FLAGS_ISO_TO_CODE[config.server.bot.flag];

if (config.server.bot.name.length === 0 || config.server.bot.name.length > 20) {
  config.server.bot.name = BOTS_SERVER_BOT_NAME;
}

if (config.connections.afkDisconnectTimeout === undefined) {
  config.connections.afkDisconnectTimeout = config.server.typeId === GAME_TYPES.BTR ? 10 : 0;
}

if (!has(FFA_VALID_SPAWN_ZONES, config.ffa.spawnZoneName)) {
  config.ffa.spawnZoneName = FFA_DEFAULT_SPAWN_ZONE;
}

mkdirSync(config.server.certs.path, { recursive: true });
mkdirSync(dirname(config.logs.path), { recursive: true });

if (config.logs.chat.length > 0) {
  mkdirSync(dirname(config.logs.chat), { recursive: true });
}

mkdirSync(config.cache.path, { recursive: true });
mkdirSync(dirname(config.accounts.userStats.path), { recursive: true });
mkdirSync(dirname(config.sync.state.path), { recursive: true });

export default config;
