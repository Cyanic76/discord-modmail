const { Client, Intents, Permissions, MessageEmbed } = require("discord.js");
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
const { paste } = require("ubuntu-pastebin");
const db = require("quick.db");

client.once('ready', async () => {
	console.log(`Logged in as ${client.user.tag}`);
})

client.login(process.env.TOKEN); // if it can't, replace process.env.TOKEN with "TOKEN"

client.on("messageCreate", async message => {
	if(message.author.bot) return;
	if(message.content.includes("@everyone") || message.content.includes("@here")) return message.author.send({content: "You're not allowed to use those mentions."});
	// Used a new table so it doesn't get messed up with the old one
	const table = new db.table("Support13");
	if(message.channel.type === "DM"){
		let active = await table.get(`support_${message.author.id}`);
		let block = await table.get(`blocked_${message.author.id}`);
		let hold = await table.get(`hold_${message.author.id}`);
		if(config.dmUsers === false) return message.author.send("Hey! Sorry, but the modmail is currently closed.")
		if(block === true) return message.author.send("You are not allowed to use modmail.");
		if(hold === true) return message.author.send("The support team put your ticket on hold. Please wait until they get back to you.")
		let guild = await client.guilds.fetch(config.guild);
		let tc = await guild.channels.fetch(config.ticketCategory);
		let channel, found = true;
		if(active === null){
			await table.add("Tickets", 1);
			let ticket = await table.get("Tickets");
			channel = await guild.channels.create(`${message.author.username}`, {
				type: "GUILD_TEXT",
				topic: `#${ticket} | From ${message.author.username}`,
				parent: tc,
				reason: `${message.author.id} opened a ticket through the modmail service.`,
				permissionOverwrites: [
					{id: guild.roles.everyone, deny: [Permissions.FLAGS.VIEW_CHANNEL]},
					{id: guild.roles.fetch(config.roles.mod), allow: [
						Permissions.FLAGS.VIEW_CHANNEL,
						Permissions.FLAGS.SEND_MESSAGES,
						Permissions.FLAGS.ATTACH_FILES,
						Permissions.FLAGS.EMBED_LINKS,
						Permissions.FLAGS.READ_MESSAGE_HISTORY
					]},
                                        {id: guild.roles.fetch(config.roles.bot), allow: [
                                                Permissions.FLAGS.VIEW_CHANNEL,
                                                Permissions.FLAGS.SEND_MESSAGES,
                                                Permissions.FLAGS.ATTACH_FILES,
                                                Permissions.FLAGS.EMBED_LINKS,
                                                Permissions.FLAGS.READ_MESSAGE_HISTORY
                                        ]}
				]
			});
			let author = message.author;
			const newTicketLog = new MessageEmbed()
				.setAuthor(author.tag, author.avatarURL())
				.setDescription(`opened ticket #${ticket}.`)
				.setTimestamp()
				.setColor("0x6666ff")
			let logs = await client.channels.fetch(config.log); // set the log channel id here
			logs.send({embeds: [newTicketLog]});
			message.author.send(`Hello! Thanks for getting in touch. Our support team will get back to you quickly.`);
			await table.set(`support_${author.id}`, {channel: channel.id, target: message.author.id, ticket: ticket});
			await table.set(`channel_${channel.id}`, {author: message.author.id})
			let support = await table.get(`support_${message.author.id}`);
			let supportchannel = await table.get(`channel_${channel.id}`);
			let text = message.content;
			await channel.send({content: `${message.author.username} opened this ticket.`})
			await channel.send({content: text});
			return;
		};
		channel = guild.channels.cache.get(active.channel);
		let text = message.content;
		channel.send({content: text});
	}
	let activechannel = await table.get(`channel_${message.channel.id}`)
	if(activechannel === null) return; // if no channel is binded, nothing happens
	let activeuser = await table.get(`support_${activechannel.author}`);
	let user = await client.users.fetch(activechannel.author);
	let text = message.content;
	let args = text.split(" ").slice(1);
	let pending = args.join(" ");
	let blocked = await table.get(`blocked_${activechannel.author}`);
	let onHold = await table.get(`hold_${activechannel.author}`);
	if(message.content.startsWith(`-r`) || message.content.startsWith(`-reply`)){
		if(blocked === true) return message.channel.send({content: "This user is blocked."});
		await user.send(`${message.author.username}: ${pending}`);
		return;
	};
	if(message.content === `${config.prefix}id`){
		return message.channel.send({content: `Ticket owner's ID is **${activechannel.author}**.`});
	};
	if(message.content === `${config.prefix}p` || message.content === `${config.prefix}hold`){
	   	if(blocked === true) return message.channel.send({content: "This user is blocked."});
		if(onHold === true) return message.channel.send({content: "This thread is already on hold."});
		await table.set(`hold_${activechannel.author}`, true);
		message.channel.send(`This thread has been put on hold.`);
		await user.send(`Hi! Your ticket has been put on hold.`);
		return;
	}
        if(message.content === `${config.prefix}up` || message.content === `${config.prefix}unhold`){
                if(blocked === true) return message.channel.send({content: "This user is blocked."});
                if(onHold === true) return message.channel.send({content: "This thread is not on hold."});
                await table.delete(`hold_${activechannel.author}`);
                message.channel.send(`This thread isn't on hold anymore.`);
                await user.send(`Hi! Your ticket isn't on hold anymore.`);
                return;
        }
	if(message.content === `${config.prefix}b` || message.content === `${config.prefix}block`){
		await table.set(`blocked_${activechannel.author}`, true);
		await user.send(`You can not use modmail until further notice.`)
		message.channel.send(`This user has been blocked from modmail, and other forms of contribution.`);
		return;
	};
	if(message.content === `${config.prefix}c` || message.content === `${config.prefix}complete`){
		let text = `Ticket #${activeuser.ticket}\n\nAuthor: ${user.username}#${user.discriminator} (${user.id})\n\n`;
		let mmap = message.channel.messages.cache.map(m => {
			text += `From ${m.author.username} - ID: ${m.id}\n${m.content}\n\n`
		});
		paste(text).then(async url => {
			const newTicketLog = new MessageEmbed()
				.setAuthor(user.tag, user.avatarURL())
				.setDescription(`closed ticket #${activeuser.ticket}.\n[Thread](${url})`)
				.setTimestamp()
				.setColor("0x666666")
				.setFooter(`Author ID: ${user.id}`)
			await client.channels.fetch(config.log).send({embeds: [newTicketLog]});
			await user.send({content: `Thanks for getting in touch! If you wish to open a new ticket, feel free to DM me.\n\nHere's the link to the thread: ${url}`})
		});
		await table.delete(`channel_${message.channel.id}`);
		await table.delete(`support_${activechannel.author}`);
	};
})

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
