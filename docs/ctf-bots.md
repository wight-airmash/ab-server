# CTF bots

* Q-bots - are currently used on [airmash.online](https://airmash.online). Source code of bots was miss, for now we only have [binaries](https://github.com/airmash-refugees/Q-bots)
* [Spatiebot](https://github.com/spatiebot/ab-bot) - Bot API + implementation based on the wight Airbattle API

## Commands

### Common

* `#status` - show amount of bots in your team
* `#help` - show help for bots commands
* `#help <command without #>` to see more details about specified command

### Leadership

Bots choose leader inside a team, who can give commands to bot.

Q-bots start the re-election every 10 minutes. Their algorithm prefers to select players with fewer points who leave a `#yes` message, thus trying to give newcomers a chance to control the bots. The idea is interesting, but in practice the result is not good. The command gives a strong player a chance to get back the control. Of course, bounty is very approximate about the strength of the player, but this is the most understandable parameter for everyone.

* If current leader is AFK you can start elections with:
    * send `#status` command
    * in next 10 seconds send `/elections` command
* If current leader does something strange or nothing:
    * send `#status` command
    * send `/usurp` command. It allows you to take the leader position "without any questions" if the leader has fewer points. 

* If you are leader and want to pass leadership to another player: `#leader <NICKNAME>`

### Bot commands

* `#cap` (or `#capture`, `#escort`) - bots will help to capture flag and escort player with the flag to your base
* `#recap` (or `#recover`) - bots will try to return stolen flag
* `#defend` - bots will defend your base
* `#auto` - auto select strategy between cap|recap|defend
* `#assist <player | me>` - bots will assist to specified player, if `me` typed bots will assist you
* `#drop` - bot, which currently have a flag will drop it to another player
* `#dropnow` - sometimes q-bots have a bug and they can't drop the flag, this command makes the bots to drop the flag at the time of the request. The bot must be within a viewport of the player sending the command.
* `#type` - choose type of plane for bots, only this types supported:
    * `predator` 
    * `mohawk`
    * `random`
* `#storm` - bots will storm the opponent's base. It's not recommend using this command, because most of the time it only helps the opponent's team with easily getting upgrades, bots are too weak in PVP.
