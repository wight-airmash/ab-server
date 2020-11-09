# Server environment variables

The list of environment variables used by the server.

### ADMIN_HTML_PATH

Default: `../admin/admin.html`

Moderation panel template. You don't need to restart a server after update the content of this file.

### ADMIN_PASSWORDS_PATH

Default: `../admin/passwords.txt`

Moderation panel access list file. You don't need to restart a server after update the content of this file.

### AFK_DISCONNECT_TIMEOUT

Default: 10 for BTR, 0 (disabled) for other game types

Timeout in minutes for inactive (AFK) user, after which they will be disconnected.

### ALLOW_NON_ASCII_USERNAMES

Default: `false`

Enable or disable filter for usernames. [Some unicode chars in the usernames cause client lags](https://github.com/wight-airmash/ab-server/issues/47).

### AUTH_LOGIN_SERVER_KEY_URL

Default: `https://login.airmash.online/key`

Public key server url. Required by [user accounts](../README.md#user-account). Only https is supported.

### BASE_PATH

Default: `"/"`

Game server URL base path.

### BOTS_IP

Default: `"127.0.0.1"`

Pre-defined bots IP list and CIDR blocks. Parsed as array, use `,` as delimiter. Applies when [whitelist](#whitelist_enabled) is enabled.

Use the [commands](./commands#server-bot-add-ip) to update the list without restarting a server.

Example: `"127.0.0.1,127.0.0.2,127.0.0.3"` will be parsed as `["127.0.0.1", "127.0.0.2", "127.0.0.3"]`.

### BOTS_NAME_PREFIX

Default: `""`

Automatically add prefix to bot names, helps to prevent mimicry. Non-bot players cannot use this prefix.

Example: `"[bot] "` (don't forget a space at the end if you want to use it as separator), the bot with a requested name `Lunokhod` will receive an assigned name `[bot] Lunokhod`.

### CACHE_PATH

Default: `../cache`

Path to the cache directory. Relative (to `app.js` [root](#app-root)) or full path.

### CERTS_PATH

Default: `../certs`

Path to the certificates directory. Relative (to `app.js` [root](#app-root)) or full path.

Must contain `privkey.pem` and `fullchain.pem` files (if `ENDPOINTS_TLS` is `true`).


### CHAT_MIN_PLAYER_SCORE_TO_VOTEMUTE

Default: 0.0

Votemute abuse prevention. Requires voters to have a score exceeding the provided threshold percentile. 

Valid values are in the range `[0.0, 1.0)`. Recommended value is `0.5`.


### CHAT_MIN_PLAYER_PLAYTIME_TO_VOTEMUTE_MS

Default: 60000

To use /votemute, player must play at least this time duration.


### CTF_BASE_SHIELD_RANDOM_INTERVAL

Default: `30`

The maximum number of seconds that can be randomly added to the basic interval of the base shield respawning.

### CTF_QBOTS_FEATURES

Default: `true`

Turn on/off features like [/usurp](./commands#usurp) or [/elections](./commands#elections) applicable only to Q-bots in CTF. Affects only CTF mode.

### ENDPOINTS_TLS

Default: `false`

Turn on/off endpoint TLS.

### EXPERIMENTAL_FASTCALL

Default: `undefined`

It is preferable to set it `1` in the production, can affect performance. See uWebSockets.js. package repository for more info.

### HOST

Default: `0.0.0.0`

Server host or IP.

### INVALID_PROTOCOL_AUTOKICK_ACK

Default: `true`

Enable or disable auto kick policy based on invalid protocol implementation `ACK` packets. Normally, you don't need to turn it off.

### INVALID_PROTOCOL_AUTOKICK_BACKUP

Default: `true`

Enable or disable auto kick policy based on invalid protocol implementation `BACKUP` packets. Normally, you don't need to turn it off.

### INVALID_PROTOCOL_AUTOKICK_PONG

Default: `true`

Enable or disable auto kick policy based on invalid protocol implementation `PONG` packets. Normally, you don't need to turn it off.

### KILL_ASSISTS

Default: `false`

Enable or disable assistance tracking in killing. With this option enabled, the reward for killing a player is distributed among all those who dealt the damage.

### LOG_CHAT_FILE

Default: `../logs/chat.log`

Chat logs file path. Relative (to `app.js` [root](#app-root)) or full path. Set to empty to turn off chat file logs.

### LOG_FILE

Default: `../logs/airbattle.log`

Logs file path. Relative (to `app.js` [root](#app-root)) or full path. Set to empty to turn off file logs.

### LOG_LEVEL

Default: `info`

Levels: debug, info, warn, error, fatal, silent. Silent level disables all log streams.

### LOG_PERFORMANCE_SAMPLES

Default: `true`

Save performance samples into log. Performance is measured every 5 seconds.

### LOG_TO_CONSOLE

Default: `false`

Send log messages to stdout. It's better not to turn on both the output in the file and in the console at the same time in production.

### MAX_PLAYERS_PER_IP

Default: `3`

Limiting the number of simultaneous connections from one IP.

### MODERATION_PANEL

Default: `true`

Enable of disable moderation panel.

### MODERATION_PANEL_URL_ROUTE

Default: `admin`

The server exports this URL path to allow privileged players to moderate the game.

### NODE_ENV

Default: `production`

Environment: development or production. Also affects the work of some dependencies.

### PACKETS_LIMIT_ANY

Default: `140`

Bucket volume per player for all incoming packets. Leak volume is 35 per second.

If the limit is exceeded, the player will be kicked for packets flooding. The penalty for repeated violation is regulated with [PACKETS_FLOODING_AUTOBAN](#packets_flooding_autoban).

### PACKETS_LIMIT_CHAT

Default: `1`

Bucket volume per player for all chat packets (public chat, team, whisper and say). Set the leak volume with [PACKETS_LIMIT_CHAT_LEAK](#packets_limit_chat_leak).

If the limit is exceeded, the player will be asked to stop spam. The penalty for repeated violation is mute for 10 minutes.

### PACKETS_LIMIT_CHAT_LEAK

Default: `1`

Leak volume per second for the chat bucket. For fine-tuning the anti-spam.

### PACKETS_LIMIT_KEY

Default: `100`

Bucket volume per player for the `KEY` packets (movement/special key presses and releases). Leak volume is 20 per second.

If the limit is exceeded, the player will be kicked for packets flooding. The penalty for repeated violation is regulated with [PACKETS_FLOODING_AUTOBAN](#packets_flooding_autoban).

### PACKETS_FLOODING_AUTOBAN

Default: `true`

Enable or disable auto ban policy for packets flooding.

### PORT

Default: `3501`

Server port.

### POWERUPS_SPAWN_CHANCE

Default FFA: `0.5`

Default CTF: `0.02`

Default BTR: `0.5`

Probability of shields and inferno boxes spawn. Valid value: `[0..1]`. Set `0` to disable shields and inferno boxes spawn.

The map is split into chunks (32 in FFA and BTR, 80 in CTF). Each chunk can hold no more than 1 powerup at a time (periodicals powerups aren't counted). One by one, once per minute, the chunks are checked for spawning possibilities. If powerup was picked up or despawned, the chunk will have a timeout to spawn of 5 minutes. After 5 minutes, considering the probability value, a powerup may be spawned again.

Set `1` for guaranteed powerup spawn after 5 minutes timeout, but don't forget about [POWERUPS_SPAWN_LIMIT](#powerups_spawn_limit).

The default values are empirical (selected during testing). Change the value with care, it may affect the balance of the games.

### POWERUPS_SPAWN_LIMIT

Default FFA: `0.4`

Default CTF: `0.05`

Default BTR: `0.25`

Limit (percentage of the chunks amount) of shields and inferno spawns per minute. Valid value: `[0..1]`. Set `0` to disable shields and inferno boxes spawn. Example: `0.5` value in FFA mode means, that 16 (0.5 \* 32 chunks) powerups is the maximum amount of boxes can be spawned per minute.

The default values are empirical (selected during testing). Change the value with care, it may affect the balance of the games.

### PROWLERS_ALWAYS_VISIBLE_FOR_TEAMMATES

Default: `false`

Allows the teammates to see prowlers while in the spectate mode. Anti-cheating feature (`false` = active). If active, only no-spectating teammates can see stealthed prowlers.

The setting option is left for compatibility.

### SCALE_FACTOR

Default: `5500`

The maximum zoom value limit of the client.

### SERVER_BOT_FLAG

Default: `JOLLY`

Server chat bot country flag. [Valid flag codes](https://github.com/wight-airmash/ab-protocol/blob/a6cb880e085099db7da0de9e7637ce22ac4d03bb/src/types/flags.ts#L142-L268).

### SERVER_BOT_NAME

Default: `Server`

Server chat bot name.

### SERVER_ROOM

Default: `ab-ffa`

Server room name.

### SERVER_TYPE

Default: `FFA`

Types: FFA, CTF or BTR.

### STATS_PATH

Default: `../data/user-stats.json`

### STATS_SYNC

Default: `false`

Allows cross-server synchronization of user stats, via the airmash.online sync service.

Public servers in the games list should set this to true. Development or private servers should leave this as false.

### SU_PASSWORD

Default: `""`

Superuser password to run some [commands](./commands.md#superuser-command). Must be filled.

### SYNC_STATE_PATH

Default: `../data/sync-state.json`

### UPGRADES_DROP_MAX_CHANCE

Default FFA: `0.65`

Default CTF: `0.8`

Maximum probability of upgrade box drop. Valid values: `[0..1]`. Must be greater than [UPGRADES_DROP_MIN_CHANCE](#upgrades_drop_min_chance). Set `0` to disable upgrades drop.

Look at the [code](https://github.com/wight-airmash/ab-server/blob/e3e5b9987891906b93c6e342ca64d223a6441acf/src/server/modes/base/maintenance/players/kill.ts#L126-L154) for details.

The default values are empirical (selected during testing). Change the value with care, it may affect the balance of the games.

### UPGRADES_DROP_MIN_CHANCE

Default FFA: `0.35`

Default CTF: `0.5`

Minimum probability of upgrade box drop. Valid values: `[0..1]`. Must be lower than [UPGRADES_DROP_MAX_CHANCE](#upgrades_drop_max_chance). Set `1` to drop upgrades every time the player dies.

Look at the [code](https://github.com/wight-airmash/ab-server/blob/e3e5b9987891906b93c6e342ca64d223a6441acf/src/server/modes/base/maintenance/players/kill.ts#L126-L154) for details.

The default values are empirical (selected during testing). Change the value with care, it may affect the balance of the games.

### USER_ACCOUNTS

Default: `true`

Enable or disable user accounts. Requires valid [AUTH_LOGIN_SERVER_KEY_URL](#auth_login_server_key_url).

### WEBSOCKETS_COMPRESSION

Default: `true`

Disabling will improve game server performance.

### WELCOME_MESSAGES

Default: `""`

The player will receive these messages after joining to the game. Parsed as array, use `%split%` as a delimiter and `%username%` to address the player.

Example: `"Hello, %username%!%split%Welcome to AB FFA server."` will be sent as two whisper messages for the player with name "wight": `"Hello, wight!"` and `"Welcome to AB FFA server."`.

### WHITELIST_ENABLED

Default: `true`

Enable or disable bots ip list.

## Notes

### App root

By default, the project is built into the `./dist/` directory.
