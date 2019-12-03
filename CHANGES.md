## Future version (unversioned)

Features:

- Players who are logged in will have their stats (earnings/kills/deaths) saved.

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
