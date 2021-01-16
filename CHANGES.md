## Future version (unversioned)

## 6.3.0 (January 16, 2021)

Features:

- Upgrades fever event ([#116](https://github.com/wight-airmash/ab-server/pull/116)). See [`/server upgrades fever`](./docs/commands.md#server_upgrades_fever) command.
- FFA alternative spawn zones ([#117](https://github.com/wight-airmash/ab-server/pull/117)). See [FFA_SPAWN_ZONE_NAME](./docs/env-variables.md#ffa_spawn_zone_name) and [`/server spawn <zone>`](./docs/commands.md#server_spawn_zone) command.
- Optional periodic CTF-like base infernos in FFA (in addition to the new spawn zones). See [FFA_BASE_INFERNOS](./docs/env-variables.md#ffa_base_infernos).

## 6.2.0 (November 11, 2020)

Features:

- Votemute config to prevent abuse ([#115](https://github.com/wight-airmash/ab-server/pull/115)). See [CHAT_MIN_PLAYER_SCORE_TO_VOTEMUTE](./docs/env-variables.md#chat_min_player_score_to_votemute) and [CHAT_MIN_PLAYER_PLAYTIME_TO_VOTEMUTE](./docs/env-variables.md#chat_min_player_playtime_to_votemute).

## 6.1.0 (October 21, 2020)

Features:

- Sync service ([#111](https://github.com/wight-airmash/ab-server/pull/111)). See [./docs/sync.md](./docs/sync.md) and [STATS_SYNC](./docs/env-variables.md#stats_sync).
- Kill assists. Disabled by default. See [KILL_ASSISTS](./docs/env-variables.md#kill_assists).

Improvements:

- CIDR blocks in [BOTS_IP](./docs/env-variables.md#bots_ip) ([#112](https://github.com/wight-airmash/ab-server/pull/112)).
- `ownerId` field in MOB_UPDATE packets ([#113](https://github.com/wight-airmash/ab-server/pull/113)).
- Original `PLAYER_TYPE` and `PLAYER_RESPAWN` packets order.

Bug fixes:

- Invalid verification of the number of connected players (max players limit).

## 6.0.1 (June 27, 2020)

Performance update.

Features:

- Save chat log (public and team) in the file. See [LOG_CHAT_FILE](./docs/env-variables.md#log_chat_file).
- [`/lags`](./docs/commands.md#lags) command.
- New network metrics. See `/server network` command result.
- New performance metrics. See `/server performance` and `/server frames` commands result.
- `/welcome` command to repeat welcome messages.
- Server URL base, [BASE_PATH](./docs/env-variables.md#base_path).
- New data in server `/` JSON response. See [docs/api.md](./docs/api.md).

Improvements:

- Original upgrades drop rate (50%).
- Original damage and health values and mechanics. See [docs/damage.md](./docs/damage.md).
- Redesigned powerups (random shields and infernos) spawn. See [POWERUPS_SPAWN_CHANCE](./docs/env-variables.md#powerups_spawn_chance) and [POWERUPS_SPAWN_LIMIT](./docs/env-variables.md#powerups_spawn_limit).
- Better lags detection, reduced probability of false anti-flooding disconnection.
- Data serialization with `fast-json-stringify`.
- Custom modes moved to `/src/modes`, `/src/server` is the base mode only.
- Typed entities.

Bug fixes:

- Server-side limited `/say` broadcasting (#51).

## 5.10.0 (March 28, 2020)

Features:

- Optional random spawn time drift of periodic powerups. The value is 30 seconds by default for CTF base shields to make timers useless, which means CTF base shields will spawn after 90 + randomInteger(0, 30) seconds after picked up. Random value updates after each picking. Use `CTF_BASE_SHIELD_RANDOM_INTERVAL` to change the max value of the random interval.

Improvements:

- Players' connection lag detecting (#104). Server tries to detect the player is lagging and don't kick it if so, the kicks because of flooding should be much less now. A new reason for disconnecting has been added ("info" log level): "Disconnect player due to lag packets amount". "Lag packets" is a new metrics (check in debug command), after player stops lagging, there is a short "grace" period for flooding through its connection. Every packet the server receives during this period counts as lag packet and drops. There is a limit for such packets per connection (for safety reason). After player reaches this limit, its connection will be closed.
- Connections closing methods refactoring. Now the server forcefully closes the second (main or backup) connection if the first one was closed. Improved cleaning from idle connections.
- CTF: the bots are evenly distributed among the teams (#102).
- CTF: ignore spectator in shuffle (#101).

Removed temporary features:

- CTF games history.

## 5.9.0 (March 15, 2020)

Features:

- [`/players`](./docs/commands.md#players) command (#86). Use it to get the stats about playing people and bots. CTF has a specific version of the command: the stats data are grouped by teams and the response is broadcasted to the public chat indicating the player who requested the stats (maximum one broadcast per 15 seconds; for the requests over the limit, a reply is sent as a whisper message). CTF command has an optional parameter: `/players [whisper]`, pass it to omit public broadcasting and get the response as a whisper message. Muted players can't initiate public chat broadcasting, they always get the results as a whisper message.

Improvements:

- Complete commands/bots documentation (#96).

## 5.8.0 (February 28, 2020)

Features:

- CTF: team chat command `#dropnow`. Sometimes q-bots have a bug and they can't drop the flag, this command makes the bots to drop the flag at the time of the request. The bot must be within viewport of the player sending the command.

Bug fixes:

- CTF recovery text alert.

## 5.7.0 (February 25, 2020)

Improvements:

- uWebSockets.js `EXPERIMENTAL_FASTCALL` environment variable (see its repository for details). Enabled (`1`) by default only in docker image. If you run a server directly, please update your .env or pass `EXPERIMENTAL_FASTCALL=1` in production to improve game server performance.
- Configurable WebSockets compression with `WEBSOCKETS_COMPRESSION` variable. Enabled by default. Disabling will improve game server performance.

## 5.6.0 (February 20, 2020)

Improvements:

- Add info about skipped frames since last performance measurement in [/server](./docs/commands.md#server) command. This may help players to determine the source of the cause of the freeze: server or player side.

Bug fixes:

- Prevent long distance teleporting after frame skipping (#93).

## 5.5.0 (February 19, 2020)

Features:

- Automatically add prefix to bot names with [BOTS_NAME_PREFIX](./docs/env-variables.md#bots_name_prefix), no prefix by default. Helps to prevent mimicry. Non-bot players cannot use this prefix.
- New fields `serverConfiguration` and `bots` for server packets `LOGIN`. See `LoginServerConfig` type and protocol lib.
- New field `isBot` for server packets `PLAYER_NEW`. `true` if the player is a bot.

Bug fixes:

- Fix BROADCAST_SCORE_BOARD packet sending order.

Removed temporary features:

- `/horizon` command.

## 5.4.0 (February 13, 2020)

Features:

- CTF: built-in help for Q-bots. Type #help in the chat to get help.

Improvements:

- Add sending of own player packets (PLAYER_UPDATE, PLAYER_FIRE, EVENT_BOUNCE, EVENT_BOOST) via backup connection (in addition to the main connection). This change improves responsiveness of aircraft control for the players. Based on the analysis of the original server logs and the frontend code.

## 5.3.0 (February 12, 2020)

- Configurable AFK disconnect timeout. Use [AFK_DISCONNECT_TIMEOUT](./docs/env-variables.md#afk_disconnect_timeout) to set the timeout value in minutes. By default it is disabled for FFA and CTF, and for BTR it is 10 minutes.

## 5.2.0 (February 11, 2020)

Improvements:

- Forced scoreboard updates for when all players respawn.
- New stats in CTF recovering feature.

Bug fixes:

- Fix moderator passwords check.

## 5.1.2 (February 10, 2020)

Improvements:

- Add recently created storages info in `/server debug` result.

Bug fixes:

- Fix the result of `/profile` command.
- Fix wrong value of CTF statistics.
- Exclude bots from the AFK auto switching (they can't respawn after spectating).
- Fix CTF leader detection for the players with non-unique names.

## 5.0.0 (February 9, 2020)

Features:

- Battle Royale mode. Set SERVER_TYPE to `BTR` to run this mode.
- CTF: `/elections` command. It allows to run the leader elections if the current leader is AFK for 2 minutes. See [commands.md](./docs/commands.md#elections).
- CTF: `/usurp` command. It allows to take over the leader position if the current leader has lower score than the player running the command. One command run per minute per team. See [commands.md](./docs/commands.md#usurp).
- `/profile` command. See [commands.md](./docs/commands.md#profile).
- "Kick" feature in moderator panel.
- Superuser `/server welcome` commands group to change welcome messages without server restart. See [commands.md](./docs/commands.md#server-welcome).
- Superuser `/server ban list` and `/server ban flush` commands. See [commands.md](./docs/commands.md#server-ban-list).

Improvements:

- CTF: automatically switch AFK players at the spawn zone into spectate mode (#75).
- After switching into spectate mode players auto watch: top player or last killer in FFA and BTR; top player or flag carrier in CTF.
- Filter CTF timer alerts (#54).
- Custom limits for packet flooding and spam (#72). Check [PACKETS_LIMIT_ANY](./docs/env-variables.md#packets_limit_any), [PACKETS_LIMIT_CHAT](./docs/env-variables.md#packets_limit_chat), [PACKETS_LIMIT_CHAT_LEAK](./docs/env-variables.md#packets_limit_chat_leak) and [PACKETS_LIMIT_KEY](./docs/env-variables.md#packets_limit_key).
- Adjustable "severity" for non-compliance with protocol (#73). Check [INVALID_PROTOCOL_AUTOKICK_ACK](./docs/env-variables.md#invalid_protocol_autokick_ack), [INVALID_PROTOCOL_AUTOKICK_BACKUP](./docs/env-variables.md#invalid_protocol_autokick_backup) and [INVALID_PROTOCOL_AUTOKICK_PONG](./docs/env-variables.md#invalid_protocol_autokick_pong).
- Players are sorted by type (human/bot) and by name in moderator panel.
- Sending `BROADCAST_CHAT_SERVER_WHISPER` is now safe without any delays after player connect (frontend anti-spam issue resolved).

Bug fixes:

- Spectators or dead players are not allowed to use `/s` (#51).
- "Not enough upgrades" is shown for already fully upgraded skill (#71).
- CTF: the bounty in the match results pop-up is always 1000 bug (#78).
- Prevent the access to undefined connection during commands run.
- Prevent the access to closed connection through side storages.

Breaking changes:

- `crypto-random-string` dependency removed.

Temporary features (will be removed soon, don't use to create any extensions/frontend features):

- `/horizon` command to debug #26.
- After each CTF match, statistics are written to the `cache/matches` directory in files. Use POST requests to `/admin/matches` and `/admin/matches/:timestamp` to download the results; the requests must pass a valid moderator password in the `password` field. The statistics don't contain any personal data (`./src/server/modes/ctf/periodic/player-stats.ts`). This data collecting is part of the preparation for writing a new balance system.

## 4.16.1 (January 21, 2020)

Bug fixes:

- Escape untrusted HTML in server CTF message broadcasts.

## 4.16.0 (January 20, 2020)

Improvements:

- Players are sorted by type (human/bot) and by score in moderator panel. Features specific to the game type are displayed depending on the type of server running ("Dismiss" is available only for CTF).
- Described available [environment variables](./docs/env-variables.md).

Bug fixes:

- Dismiss sometimes didn't work (#67).

Breaking changes:

- Remove "Sanction" feature from moderator panel (#71).

## 4.15.0 (January 12, 2020)

Improvements:

- Configurable bans policy on packets flooding. Use PACKETS_FLOODING_AUTOBAN variable to enable or disable bans by server for repeated violations. Enabled by default.

Bug fixes:

- Send PACKET_FLOODING_BAN error instead of GLOBAL_BAN to the client.

## 4.14.0 (January 10, 2020)

Features:

- Server welcome messages. Use WELCOME_MESSAGES to add the messages players will receive after joining the game.
  No messages by default. See more in .env.example.

Bug fixes:

- Incorrect actions date displaying in moderators panel.

## 4.13.0 (January 8, 2020)

Features:

- Forced elections: dismiss a player from the position of leader in moderators panel.

## 4.12.1 (January 8, 2020)

Bug fixes:

- Fix undefined connections bug (#66).

## 4.12.0 (January 7, 2020)

Improvements:

- EVENT_LEAVEHORIZON is used to instantly hide players who have switched to spectator mode. Previously, within 3 seconds (frontend value), players could see the phantom.
- Optimised and speeded up the docker image building.

Bug fixes:

- Allow no-spectating teammates to see prowlers (#63).
- Player might get muted for spam due to network lag (#41).
- Packet flooding banhammer (#56).

## 4.11.2 (January 3, 2020)

Bug fixes:

- The PLAYER_LEVEL packet is now sent to every player to correctly visual updates.

## 4.11.1 (January 2, 2020)

Bug fixes:

- Fix uWebSockets.js checkout in Dockerfile.

## 4.11.0 (January 2, 2020)

Features:

- Players who are logged in will have their stats (earnings/kills/deaths) saved. Don't forget to mount ./data directory to not to lose users data. Use USER_ACCOUNTS to disable this feature.
- Unmute feature in moderators panel.

Improvements:

- Update /votemute: only unique IPs are counted.

## 4.10.3 (December 7, 2019)

Bug fixes:

- Add non case-sensitive #attack blocking.

## 4.10.2 (December 5, 2019)

Bug fixes:

- Add synonym "#atack" for the blocked command #attack.

## 4.10.1 (December 3, 2019)

Bug fixes:

- Add content-type header to /admin response (#60).

## 4.10.0 (December 1, 2019)

Features:

- Moderation panel (see readme.md).

Improvements:

- CTF: block #attack command (#53).

## 4.9.0 (November 7, 2019)

Improvements:

- CTF: bounty reward depends on active playing for the team (#42).
- Optionally disabling non-ASCII chars in usernames (#47).

## 4.8.0 (October 28, 2019)

Improvements:

- Only ASCII chars are allowed in usernames (#47).
- Bots are no longer counted when calculating the number of votes required for mute.

## 4.7.3 (October 9, 2019)

Bug fixes:

- Invulnerability while crossing own dropped upgrades (#46).

## 4.7.2 (October 3, 2019)

Bug fixes:

- Server crash during connection closing (#44).

## 4.7.1 (October 1, 2019)

Bug fixes:

- Docker image directories rights (#43).

## 4.7.0 (September 21, 2019)

Features:

- Command /spectators. Shows how many players are spectating you.
- Customise server bot by passing environment variables SERVER_BOT_NAME and SERVER_BOT_FLAG.

Improvements:

- The server bot is completely "removed" for other bots.

## 4.6.0 (September 19, 2019)

Improvements:

- New storage: list of main connection IDs per IP.

Bug fixes:

- Instant unmute (#40).

## 4.5.0 (September 18, 2019)

Improvements:

- The server bot is no longer displayed in the list of players.
- Projectiles damage increases or decreases depending on the collision speed.

## 4.4.2 (September 14, 2019)

Bug fixes:

- Invalid CTF reward (#27).
- Country flag flushing (#28).
- Mute command affects superuser (#32).
- Viewport detaching (#30).
- Prowler microteleport (#35).

## 4.4.0 (September 11, 2019)

Public release.

Features:

- Superuser commands: /server whitelist, /server bot, /server mute, /server unmute, /server kick and /server ban.

Improvements:

- New limits for commands.
- Text split for server bot broadcasting.

Bug fixes:

- Invalid bots detection.
