# Server in-game commands

Commands are executed via the chat interface.

### /flag \<ISO code\>

Update player country flag.

### /votemute \<player name\>

Vote to mute player.

### /t \<message\>

Send a message to the team chat.

### /s \<message\>

Say a message in the bubble.

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

### /server

Get server version and the result of the last performance check.

### /server upgrades

Server upgrades drop range: min and max chance value (the final value depends on victim stats).

### /server powerups

Server powerups spawn chance.

### /server debug

Server debug info.

### /server limits

Values of the player limits.

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

### /server powerups \<value\>

Set the chance value of the powerups spawn.

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
