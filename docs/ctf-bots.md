# CTF Q-bots

Source code of bots was miss, for now we only have [binaries](https://github.com/airmash-refugees/Q-bots)

## Commands

### Common

* `#status` - show amount of bots in your team
* `#help` - show help for bots commands
* `#help <command without #>` to see more details about specified command

### Leadership

Bots choose leader inside a team, who can give commands to bot.

* If current leader is AFK you can start elections with:
    * send `#status` command
    * in next 10 seconds send `/elections` command

* If you are leader and want to pass leadership to another player: `#leader <NICKNAME>`

### Bot commands

* `#cap` (or `#capture`, `#escort`) - bots will help to capture flag and escort player with the flag to your base
* `#recap` (or `#recover`) - bots will try to return stolen flag
* `#defend` - bots will defend your base
* `#auto` - auto select strategy between cap|recap|defend
* `#assist <player | me>` - bots will assist to specified player, if `me` typed bots will assist you
* `#drop` - bot, which currently have a flag will drop it to another player
* `#type` - choose type of plane for bots, only this types supported:
    * `predator` 
    * `mohawk`
    * `random`
* `#storm` - bots will storm the opponent's base. It's not recommend using this command, because most of the time it only helps the opponent's team with easily getting upgrades, bots are too weak in PVP.
