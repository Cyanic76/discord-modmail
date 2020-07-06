# Discord.JS 12 Modmail
A modmail with rich features.

## Features
- Ticket __number__ (no utility yet)
- Anonymous reply (`areply` command)
- Normal reply (`reply` command)
- Block and unblock users (`block` & `unblock` commands)
- Pause a ticket (`pause` & `continue` commands)
- 10-seconds timeout before deleting channel after closing a ticket (`complete`)
- Notify the author when pausing/unpausing/closing a ticket.
- Get the user ID (`id` command)

The bot will only send mods' messages to the user if mods use `reply`/`areply` commands.

## Installation
1. [Clone this repo](https://github.com/Cyanic76/discord-modmail/archive/master.zip)
2. Install NPM/Node
3. Run `npm install discord.js` (it'll automatically install 12.2.0 version)
4. Run `npm install quick.db`
5. Start your bot.

## Needed Node modules/plugins
- `discord.js^12.2.0`, the core plugin.
- `quick.db^7.1.1`, the database plugin.

[View in package.json](https://github.com/Cyanic76/discord-modmail/blob/master/package.json#L9)

## About

**discord-modmail** by Cyanic76, a JS modmail with rich features.
