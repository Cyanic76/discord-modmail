# Discord.JS 12.4.1 Modmail
A modmail with rich features.

## Features
- Ticket __number__
- Normal __and anonymous__ reply (anonymous means you reply on behalf on the whole support/moderation team)
- Block and unblock users (`block` & `unblock` commands)
- Pause a ticket (`pause` & `continue` commands)
- 10-seconds timeout before deleting channel after closing a ticket (`complete`)
- Notify the author when pausing/unpausing/closing a ticket.
- Get the user ID (`id` command)
- __Logs!__ You can now make the bot sends block/unblock and tickets creation/deletion to any channel. If you don't want logs, just don't fill in [this](https://github.com/Cyanic76/discord-modmail/blob/master/config.json#L3).

*The bot will only send mods' messages to the user if mods use `reply`/`areply` commands. The user will not get a notice if you block/unblock them.*

*You may unblock users from anywhere in your server as long as you have the required role (usually moderator or member of support team) with their ID.*

## Installation
1. [Clone this repo](https://github.com/Cyanic76/discord-modmail/archive/master.zip)
2. Install NPM/Node
3. Run `npm install discord.js` (it'll automatically install the latest version)
4. Run `npm install quick.db`
5. Start your bot.

## Needed Node modules/plugins
- `discord.js^12.4.1`, the core plugin.
- `quick.db^7.1.2`, the database plugin.

[View in package.json](https://github.com/Cyanic76/discord-modmail/blob/master/package.json#L9)

## About

**discord-modmail** by Cyanic76, a JS modmail with rich features.
