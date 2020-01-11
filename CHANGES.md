## Future version (unversioned)

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
