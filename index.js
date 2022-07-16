const { Client, Intents, Permissions } = require("discord.js");
const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.DIRECT_MESSAGES,
        Intents.FLAGS.DIRECT_MESSAGE_TYPING,
        Intents.FLAGS.DIRECT_MESSAGE_REACTIONS
    ],
    partials: ["CHANNEL"]
}) // not sure about intents, though
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
const config = require("./config.json");
const strings = require("./strings.json");
const { paste } = require("ubuntu-pastebin");
const { QuickDB } = require("quick.db");
const db = new QuickDB();
// If you store your database somewhere else, uncomment & edit the following:
// const db = new QuickDB({filePath: "/path/to/db.sqlite"});

// Notify once logged in
client.once("ready", () => {
	console.log(`Logged in as ${client.user.tag}.`);
})

// Log in
client.login(config.token);
// If that doesn't work, uncomment & edit this:
// client.login("PUT YOUR TOKEN HERE");

client.on("messageCreate", async message => {
	if(message.author.bot) return;
	let guild = await client.guilds.fetch(config.id.server);
	if(guild.members.fetch(message.author.id).communicationDisabledUntilTimestamp !== null && config.permissions.disableOnTimeout === true) return message.author.send(strings.disableOnTimeout);
	if(guild.members.fetch(message.author.id).pending) return message.author.send(strings.pending);
	let text = message.content.replace(/[`]|@everyone|@here/g, '');
	// Use table from 1.1.9
	const table = db.table("Support13")
	
	if(message.channel.type === "DM"){
		let active = await table.get(`support_${message.author.id}`);
		let block = await table.get(`blocked_${message.author.id}`);
		if(config.enabled === false) return message.author.send(strings.disabled);
		if(block === true) return message.author.send(strings.blocked);
		let ticketcategory = await guild.channels.fetch(config.id.ticketCategory);
		let channel, found = true;
		
		// NEW TICKET
		if(active === null){
			await table.add("Tickets", 1);
			let ticket = await table.get("Tickets");
			
			channel = await guild.channels.create(`${message.author.username}`, {
				topic: `#${ticket} | From ${message.author.username}`,
				parent: ticketcategory,
				reason: `${message.author.id} opened a ticket through the modmail service.`,
				permissionOverwrites: [
					{id: guild.roles.everyone, deny: [Permissions.FLAGS.VIEW_CHANNEL]},
					{id: guild.roles.resolve(config.roles.mod), allow: [
						Permissions.FLAGS.VIEW_CHANNEL,
						Permissions.FLAGS.SEND_MESSAGES,
						Permissions.FLAGS.ATTACH_FILES,
						Permissions.FLAGS.EMBED_LINKS,
						Permissions.FLAGS.READ_MESSAGE_HISTORY
					]},
	        {id: guild.members.resolve(client.user.id), allow: [
	          Permissions.FLAGS.VIEW_CHANNEL,
	          Permissions.FLAGS.SEND_MESSAGES,
	          Permissions.FLAGS.ATTACH_FILES,
	          Permissions.FLAGS.EMBED_LINKS,
	          Permissions.FLAGS.READ_MESSAGE_HISTORY
	        ]}
				]
			});
			
			let author = message.author;
			try {
				const newTicketLog = new MessageEmbed()
				.setAuthor(author.tag, author.avatarURL())
				.setDescription(`Ticket ${ticket} opened`)
				.setTimestamp().setColor("0x6666ff")
				let logs = await client.channels.fetch(config.id.logchannel); // set the log channel id here
				logs.send({embeds: [newTicketLog]});
			} catch(e) {
				console.warn("Could not send log embed. Ignoring...");
			}
			
			message.author.send(strings.welcome);
			await table.set(`support_${author.id}`, {channel: channel.id, target: author.id, ticket: ticket});
			await table.set(`channel_${channel.id}`, author.id);
			await channel.send(`**New ticket (#${ticket})**\nAuthor: ${author.tag}`);
			await channel.send(`${author.username}: ${text}`);
			
		} // End of new ticket
		channel = guild.channels.cache.get(active.channel);
		// TODO: Do something when channel doesn't exists or no permissions
		channel.send(`${message.author.username}: ${text}`);
	}
	const author = message.author;
	let activechannel = await table.get(`channel_${message.channel.id}`);
	if(activechannel === null) return; // TODO: If no channel is binded, notify mods
	const userID = activechannel.author;
	let activeuser = await table.get(`support_${userID}`);
	let user = await client.users.fetch(userID);
	let args = text.split(" ").slice(1); // use "text" var here
	let pending = args.join(" ");
	let blocked = await table.get(`blocked_${userID}`);
	const prefix = config.prefix;
	
	// Reply
	if(message.content.startsWith(`${prefix}r`) || message.content.startsWith(`${prefix}reply`)){
		if(blocked) return message.channel.send(strings.thread.blocked)
		if(message.guild.member(user).communicationDisabledUntilTimestamp !== null && config.permissions.disableOnTimeout === true) return message.channel.send(strings.thread.timeout);
		await user.send(`${author.username}: ${pending}`);
		return;
	}
	
	// Get the ID
	if(message.content === `${prefix}id`){
		return message.channel.send(`The ID of this thread's author is ${userID}.`);
	}
	
	// Block the user
	if(message.content === `${prefix}block`){
		await table.set(`blocked_${activechannel.author}`, true);
		if(config.permissions.notifyUserOnBlock) await user.send(strings.nowBlocked);
		return message.channel.send(strings.thread.nowBlocked);
	}
	
	// Close the ticket
	if(message.content === `${prefix}close`){
		let text = `Ticket #${activeuser.ticket}\n\nAuthor: ${user.tag} (${user.id})\n\n`;
		let list = message.channel.messages.cache.map(m => {
			text += `${m.author.tag} (message ${m.id})\n${m.content}\n\n`
		})
		paste(text).then(async url => {
			// Send log
			try {
				const oldTicketLog = new MessageEmbed()
				.setAuthor(author.tag, author.avatarURL())
				.setDescription(`Ticket ${ticket} closed\n[Message log](${url})`)
				.setTimestamp().setColor("0x666666")
				let logs = await client.channels.fetch(config.id.logchannel); // set the log channel id here
				logs.send({embeds: [oldTicketLog]});
			} catch(e) {
				console.warn("Could not send log embed. Ignoring...");
			}
			// Notify user
			await user.send(strings.nowClosed.replace("{{URL}}", url));
		})
		await table.delete(`channel_${message.channel.id}`);
		await table.delete(`support_${activechannel.author}`);
	}
})

// Unblock feature
client.on("messageCreate", async message => {
  if(message.content.startsWith(`${config.prefix}unblock`)){
    if(message.guild.member(message.author).roles.cache.has(config.roles.mod)){
      var args = message.content.split(" ").slice(1);
      client.users.fetch(`${args[0]}`).then(async user => {
	const dbTable3 = new db.table("Support13");
      	let data = await dbTable3.get(`blocked_${args[0]}`);
        if(data === true){
          await dbTable3.delete(`blocked_${args[0]}`);
          return message.channel.send(`Successfully unblocked ${user.username} (${user.id}) from the modmail service.`);
        } else {
          return message.channel.send(`${user.username} (${user.id}) is not blocked from the modmail at the moment.`)
        }
      }).catch(err => {
        if(err) return message.channel.send("Unknown user.");
      })
    } else {
      return message.channel.send("You can not use that.");
    }
  }
})
