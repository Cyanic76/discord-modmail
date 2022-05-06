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
const config = require("../config.json"); // located at the root of the repo
const { paste } = require("ubuntu-pastebin");
const { Client, Intents, Permissions, MessageEmbed } = require("discord.js");
const mongo = require("mongoose");
const {User,Channel,Ticket} = require("./db.js");

client.once("ready", async () => {
    console.log(`Logged in as ${client.user.tag}`);
    try {
        await mongo.connect(process.env.MONGO, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useFindAndModify: true
        });
        client.db = mongo.connection;
        console.log("Logged in to MongoDB database.");
    } catch(e) {
        console.log(`Couldn't log in to MongoDB.\n${e}`)
    }
})

client.login(process.env.TOKEN) // located at ../process.env

client.on("messageCreate", async message => {
    
    // Refuse pending/timed out/bots/mentions
	if(message.guild.member(message.author).communicationDisabledUntilTimestamp !== null) return message.author.send("Hey!\nLooks like you're on timeout. You can't use the modmail while on timeout.")
	if(message.guild.member(message.author).pending) return message.author.send("Hey!\nYou still have to pass the guild's membership gate to use the modmail.")
	if(message.content.includes("@everyone") || message.content.includes("@here")) return message.author.send("You're not allowed to use those mentions.");
	if(message.author.bot) return;
    
    if(message.channel.type === "DM"){
        
        // Get the guild from the DB and Discord then get the channel from Discord
        let active = await User.findOne({target: message.author.id});
        if(config.dmUsers === false) return message.author.send("Hey!\nSorry, but the modmail is currently closed. If you already have an open ticket, it will be kept open.");
        if(active.block === true) return message.author.send("You are not allowed to use the modmail.");
        if(active.onHold === true) return message.author.send("The support team put your ticket on hold. Please wait until they get back to you.")
        let guild = await client.guilds.fetch(config.guild);
        let tc = await guild.channels.fetch(config.ticketCategory);
        let channel, found = true;
        
        // If not active
        if(active === null || !active){
            
            // Get the ticket number & add one
            let ticket = await Ticket.findOne({});
            if(ticket){
                let ticketDB = await Ticket.findOneAndUpdate({}, {$inc: { number: 1 }});
            } else {
                let ticketDB = new Ticket({number: 1});
            }
	
	    	// Create the channel
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
			
			// Send the new ticket embed
			let author = message.author;
			const log_newTicket = new MessageEmbed()
				.setAuthor(author.tag, author.avatarURL())
				.setDescription(`opened ticket #${ticket}.`)
				.setTimestamp()
				.setColor("0x6666ff")
			let logs = await client.channels.fetch(config.log)
			logs.send({embeds: [log_newTicket]});
			message.author.send(`Hello! Thanks for getting in touch. Our support team will get back to you quickly.`);
			let supportData = new User({ticket: ticket.number, target: author.id ,channel: channel.id});
			await supportData.save();
            let channelData = new Channel({channel: channel.id, author: author.id});
            await channelData.save();
			let text = message.content;
			await channel.send({content: `${message.author.username} opened this ticket.`})
			await channel.send({content: text}); // Send plain text
			return;
            
        };
		channel = guild.channels.cache.get(active.channel);
		channel.send({content: message.content});
        
    }
	
	// Support team side
	let activechannel = await Channel.findOne({channel: message.channel.id});
	if(activechannel === null || !activechannel) return;
	let activeuser = await User.findOne({target: activechannel.author});
	let discordUser = await client.users.fetch(activechannel.author);
	let text = message.content;
	let args = text.split(" ").slice(1);
	let pending = args.join(" ");
	let blocked = activeuser.blocked;
	let onHold = activeuser.onHold;
	
	// Reply
	if(text.startsWith(`${config.prefix}r`) || text.startsWith(`${config.prefix}reply`)){
		if(blocked === true) return message.channel.send({content: "This user is blocked."});
		if(message.guild.member(discordUser).communicationDisabledUntilTimestamp !== null) return message.author.send("This user is on timeout.")
		await discordUser.send(`${message.author.username}: ${pending}`);
		return;
	}
	
	// Show UID
	if(text === `${config.prefix}id`){
		return message.channel.send({content: `Ticket owner's ID is **${activechannel.author}**.`});
	}
	
	// Put on hold
	if(text === `${config.prefix}p` || text === `${config.prefix}hold`){
		if(blocked === true) return message.channel.send({content: "This user is blocked."});
		if(onHold === true) return message.channel.send({content: "This thread is already on hold."});
		activeuser.onHold = true;
		await activeuser.save();
		message.channel.send(`This thread has been put on hold.`);
		await discordUser.send(`Hi! Your ticket has been put on hold.`);
        return;
	}
	
	// Cancel on hold
	if(text === `${config.prefix}up` || text === `${config.prefix}continue`){
		if(onHold === true) return message.channel.send({content: "This thread is not on hold."});
		if(blocked === true) return message.channel.send({content: "This user is blocked."});          
		activeuser.onHold = false;
		await activeuser.save();
		message.channel.send(`This thread isn't on hold anymore.`);
		await discordUser.send(`Hi! Your ticket isn't on hold anymore.`);
		return;
	}
	
	// Block a user
	if(message.content === `${config.prefix}b` || message.content === `${config.prefix}block`){
		activeuser.block = true;
		await activeuser.save();
		message.channel.send(`This user has been blocked from modmail.`);
		await discordUser.send(`You can't use the modmail until further notice.`)
		return;
	}
	
	// Close
	if(message.content === `${config.prefix}c` || message.content === `${config.prefix}close`){
		let text = `Ticket #${activeuser.ticket}\n\nAuthor: ${discordUser.username}#${discordUser.discriminator} (${discordUser.id})\n\n`;
		let mmap = message.channel.messages.cache.map(m => {
			text += `From ${m.author.username} - ID: ${m.id}\n${m.content}\n\n`
		});
        paste(text).then(async url => {
			const log_deletedTicket = new MessageEmbed()
				.setAuthor(discordUser.tag, discordUser.avatarURL())
				.setDescription(`closed ticket #${activeuser.ticket}.\n[Thread](${url})`)
				.setTimestamp()
				.setColor("0x666666")
				.setFooter(`ID: ${discordUser.id}`)
			await client.channels.fetch(config.log).send({embeds: [log_deletedTicket]});
			await user.send({content: `Thanks for getting in touch! If you wish to open a new ticket, feel free to DM me.\n\nHere's the link to the thread: ${url}`})
		})
		// Should remove data here
	}
});

client.on("messageCreate", async message => {
	if(message.content.startsWith(`${config.prefix}unblock`)){
		if(message.guild.member(message.author).roles.cache.has(config.roles.mod)){
			var args = message.content.split(" ").slice(1);
			client.users.fetch(`${args[0]}`).then(async user => {
				let dbUser = await User.findOne({target: user.id});
				dbUser.blocked = false;
				await dbUser.save();
				return message.channel.send(`Unblocked ${user.username} (${user.id}).`);
			}).catch(err => {
				return message.channel.send("Unknown user. Did they leave the server?");
			})
		} else {
			return message.channel.send("You can't use that.")
		}
	}
})
