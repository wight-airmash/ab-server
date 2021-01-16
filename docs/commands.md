# Server in-game commands

Commands are executed via the chat interface.

### /flag \<ISO code\>

Update player country flag.

Also, this custom flags supported:

- `communist`
- `confederate`
- `imperial`
- `rainbow`
- `jolly`

### /votemute \<player name\>

Vote to mute player.

### /t \<message\>

Send a message to the team chat.

### /s \<message\>

Say a message in the bubble.

Also, you can send an emotion in the bubble:

- `/tf`
- `/pepe`
- `/clap`
- `/lol`
- `/bro`
- `/kappa`
- `/cry`
- `/rage`

### /w \<player name\> \<message\>

Send a private message to the player.

### /upgrade \<type\>

Apply an upgrade. Types from 1 to 4.

### /upgrades drop [amount=1]

Drop upgrades.

### /upgrades reset [speed|defense|energy|missile]

Reset applied upgrades. Empty type = reset all at once.

### /respawn \<type\>

Respawn from spectator mode. Types from 1 to 5.

### /spectate -3

Switch into spectator mode.

### /spectate -1

Spectate the next players.

### /spectate -2

Spectate the previous players.

### /spectate \<id\>

Spectate player by ID.

### /spectators

How many players are spectating you.

### /profile

Your stats.

### /drop

Drop CTF flag.

### /switch

Switch CTF team.

### /match

CTF match info.

### /elections

Run the leader elections if the current leader is AFK for 2 minutes in CTF. Works only with Q-bots.

### /usurp

Take over the leader position in CTF. You must have higher score than the current leader. Works only with Q-bots.

### /players [whisper]

Info about the humans and bots currently playing. CTF stats data are grouped by teams and the results are broadcasted to the public chat indicating the player who requested the stats (muted players can't initiate broadcasting), limited by 1 message per 15 seconds. In CTF pass `whisper` parameter to get the results as a whisper message without public broadcasting.

### /server

Get server version and the result of the last performance check.

### /server upgrades

Server upgrades drop range: min and max chance value (the final value depends on victim stats).

### /server powerups

Server powerups config.

### /server debug

Server debug info.

### /server limits

Values of the player limits.

### /server network

Debug server network.

### /server performance

Debug server performance.

### /server frames

Dropped frames stats.

### /lags

Information about when the server detected lags on the player side and when was last frame drop.

### /welcome

Repeat server welcome messages.

### /su \<password\>

Become a superuser.

## Superuser command.

You need to be a superuser to run these commands.

### /server health

Announce the result of the last performance check in public chat.

### /server say \<message\>

Send a message to public chat from the Server bot.

### /server upgrades min \<value\>

Set the min value of the upgrades drop chance.

### /server upgrades max \<value\>

Set the max value of the upgrades drop chance.

### /server upgrades fever

Toggle upgrades fever event. If enabled, all the players are constantly full upgraded (5555 pattern) and the bots have 3233 upgrades state pattern.

### /server powerups chance \<value\>

Set the chance value of the powerups spawn, [0, 1].

### /server powerups limit \<value\>

Set the limit value of the powerups spawn, [0, 1].

### /server whitelist

Whitelist status.

### /server whitelist on

Turn whitelist on. Only affects new players.

### /server whitelist off

Turn whitelist off. Only affects new players.

### /server bot add \<IP\>

Add a bot IP. Only affects new players.

### /server bot remove \<IP\>

Remove a bot IP. Only affects new players.

### /server mute id \<PlayerId\>

Mute the player by ID (60 minutes by default).

### /server mute name \<PlayerName\>

Mute the player by name (60 minutes by default).

### /server mute ip \<IP\>

Mute the IP (60 minutes by default). Only affects new players.

### /server unmute id \<PlayerId\>

Unmute the player by ID.

### /server unmute name \<PlayerName\>

Unmute the player by name.

### /server unmute ip \<IP\>

Unmute the IP. Only affects new players.

### /server kick id \<PlayerId\>

Kick the player by ID.

### /server kick name \<PlayerName\>

Kick the player by name.

### /server ban add \<IP\>

Add an IP into the ban list. Only affects new players.

### /server ban remove \<IP\>

Remove an IP from the ban list. Only affects new players.

### /server ban has \<IP\>

Check an IP ban status.

### /server ban list

Display the list of IPs and reasons.

### /server ban flush

Remove all the IPs from the ban list.

### /server welcome list

Display the list of welcome messages.

### /server welcome add \<message\>

Add a welcome message to the end of the list. `%split%` doesn't work here, add the messages one by one.

### /server welcome remove \<messageIndex\>

Remove a message by the index from [/server welcome list](#server-welcome-list) result.

### /server welcome flush

Remove all the welcome messages from the list.

### /server spawn <zone>

Set an alternative spawn zone for FFA.  Valid zones are `europe`, `canada`, `latam`, and `asia`.
