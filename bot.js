const Discord = require("discord.js");
const db = require("quick.db");
const config = require("./config.json");
const dbTable = new db.table("Tickets");

// declare the client
const client = new Discord.Client();

// do something when the bot is logged in
client.on("ready", () => {
  console.log(`Successfully logged in as ${client.user.tag}.`)
  console.log(`Guild ID: ${config.guild}\nLogs channel ID: ${config.log}\nPrefix: ${config.prefix}`)
})

client.on("message", async message => {
  
  if(message.channel.type === "dm"){
    if(message.author.bot) return;
    if(message.content.includes("@everyone") || message.content.includes("@here")) return message.author.send("I'm sorry, but you can not use everyone/here mentions in a modmail thread.")
    let active = await dbTable.get(`support_${message.author.id}`);
    let guild = client.guilds.cache.get(config.guild);
    let channel, found = true;
    let user = await dbTable.get(`isBlocked${message.author.id}`);
    if(user === true || user === "true") return message.react("❌");
    if(active === null){
      active = {};
      let everyone = guild.roles.cache.get(guild.roles.everyone.id);
      let bot = guild.roles.cache.get(config.roles.bot);
      await dbTable.add("ticket", 1)
      let actualticket = await dbTable.get("ticket");
      channel = await guild.channels.create(`${message.author.username}-${message.author.discriminator}`, { type: 'text', reason: `New modmail thread: #${actualticket}.` });
      channel.setParent(config.ticketCategory);
      channel.setTopic(`#${actualticket} | Use ${config.prefix}complete to close this ticket | ${message.author.username}'s ticket`)
      config.roles.mod.forEach(mod => {
      	let modrole = guild.roles.cache.get(mod);
      	if(!modrole){
      		console.warn("I could not fetch this role. Does it exist? Is this the right role ID?")
      	} else {
		    channel.createOverwrite(modrole, {
		      VIEW_CHANNEL: true,
		      SEND_MESSAGES: true,
		      READ_MESSAGE_HISTORY: true
		    });
      	}
      })
      channel.createOverwrite(everyone, {
        VIEW_CHANNEL: false
      });
      channel.createOverwrite(bot, {
        VIEW_CHANNEL: true,
        SEND_MESSAGES: true,
        READ_MESSAGE_HISTORY: true,
        MANAGE_MESSAGES: true
      })
      let author = message.author;
      const newTicket = new Discord.MessageEmbed()
		.setColor("GREEN")
		.setAuthor(author.tag, author.avatarURL({dynamic: true}))
		.setTitle(`Ticket #${actualticket}`)
		.addField("Channel", `<#${channel.id}>`, true)
      let supportServer = client.guilds.cache.get(config.guild);
      if(config.logs){
		try {
			supportServer.channels.cache.get(config.log).send({embed: newTicket})
		} catch(e) {
			if(e) supportServer.channels.cache.get(config.log).send(`Ticket #${actualticket} was created by ${author.tag}.`)
		}
      }
      const newChannel = new Discord.MessageEmbed()
        .setColor("BLUE").setAuthor(author.tag, author.avatarURL())
        .setDescription(`Ticket #${actualticket} created.\nUser: ${author}\nID: ${author.id}`)
        .setTimestamp()
      try {
      	supportServer.channels.cache.get(channel.id).send({embed:newChannel});
      } catch(e) {
      	supportServer.channels.cache.get(channel.id).send(`This ticket was created by ${author.tag}.`)
      }
      message.author.send(`Thanks for contacting the support team! We'll get back to you quickly.\nYour ticket ID is #${actualticket}.`)
      active.channelID = channel.id;
      active.targetID = author.id;
    }
    channel = client.channels.cache.get(active.channelID);
    var text = message.content;
    var isPaused = await dbTable.get(`suspended${message.author.id}`);
    var isBlocked = await dbTable.get(`isBlocked${message.author.id}`);
    if(isPaused === true){
    	return message.channel.send("Sorry, but your ticket is currently paused. I'll message you back when the support team unpause it.")
    }
    if(isBlocked === true) return; // the user is blocked, so we're just gonna move on.
    if(message.attachments.size > 0){
      let attachment = new Discord.MessageAttachment(message.attachments.first().url)
      try {
      	client.channels.cache.get(active.channelID).send(`${message.author.username} > ${text}`, {files: [message.attachments.first().url]})
  	  } catch(e) {
  	  	if(e) client.guilds.cache.get(config.guild).channels.cache.get(active.channelID).send(`${message.author.username} > ${text}`, {files: [message.attachments.first().url]})
  	  }
    } else {
    	try {
    		client.channels.cache.get(active.channelID).send(`${message.author.username} > ${text}`);
    	} catch(e) {
    		if(e) client.guilds.cache.get(config.guild).channels.cache.get(active.channelID).send(`${message.author.username} > ${text}`)
    	}
    }
    await dbTable.set(`support_${message.author.id}`, active);
    await dbTable.set(`supportChannel_${active.channelID}`, message.author.id);
    return;
  }
  if(message.author.bot) return;
  var support = await dbTable.get(`supportChannel_${message.channel.id}`);
  let supportServer = client.guilds.cache.get(config.guild);
  if(support){
    var support = await dbTable.get(`support_${support}`);
    let supportUser = client.users.cache.get(support.targetID);
    if(!supportUser) return message.channel.delete();

    // reply (with user and role)
    if(message.content.startsWith(`${config.prefix}reply`)){
      var isPause = await dbTable.get(`suspended${support.targetID}`);
      let isBlock = await dbTable.get(`isBlocked${support.targetID}`);
      if(isPause === true) return message.channel.send("This ticket already paused. Unpause it to continue.")
      if(isBlock === true) return message.channel.send("The user is blocked. Unblock them to continue or close the ticket.")
      var args = message.content.split(" ").slice(1)
      let msg = args.join(" ");
      message.react("✅");
      if(message.attachments.size > 0){
        let attachment = new Discord.MessageAttachment(message.attachments.first().url)
        return supportUser.send(`${message.author.username} > ${msg}`, {files: [message.attachments.first().url]})
      } else {
        return supportUser.send(`${message.author.username} > ${msg}`);
      }
    };
    
    // anonymous reply
    if(message.content.startsWith(`${config.prefix}areply`)){
      var isPause = await dbTable.get(`suspended${support.targetID}`);
      let isBlock = await dbTable.get(`isBlocked${support.targetID}`);
      if(isPause === true) return message.channel.send("This ticket already paused. Unpause it to continue.")
      if(isBlock === true) return message.channel.send("The user is blocked. Unblock them to continue or close the ticket.")
      var args = message.content.split(" ").slice(1)
      let msg = args.join(" ");
      message.react("✅");
      return supportUser.send(`Support Team > ${msg}`);
    };
    
    // print user ID
    if(message.content === `${config.prefix}id`){
      return message.channel.send(`User's ID is **${support.targetID}**.`);
    };
    
    // suspend a thread
    if(message.content === `${config.prefix}pause`){
      var isPause = await dbTable.get(`suspended${support.targetID}`);
      if(isPause === true || isPause === "true") return message.channel.send("This ticket already paused. Unpause it to continue.")
      await dbTable.set(`suspended${support.targetID}`, true);
      var suspend = new Discord.MessageEmbed()
      .setDescription(`⏸️ This thread has been **locked** and **suspended**. Do \`${config.prefix}continue\` to cancel.`)
      .setTimestamp()
      .setColor("YELLOW")
      message.channel.send({embed: suspend});
      return client.users.cache.get(support.targetID).send("Your ticket has been paused. We'll send you a message when we're ready to continue.")
    };
    
    // continue a thread
    if(message.content === `${config.prefix}continue`){
      var isPause = await dbTable.get(`suspended${support.targetID}`);
      if(isPause === null || isPause === false) return message.channel.send("This ticket was not paused.");
      await dbTable.delete(`suspended${support.targetID}`);
      var c = new Discord.MessageEmbed()
      .setDescription("▶️ This thread has been **unlocked**.")
      .setColor("BLUE").setTimestamp()
      message.channel.send({embed: c});
      return client.users.cache.get(support.targetID).send("Hi! Your ticket isn't paused anymore. We're ready to continue!");
    }
    
    // block a user
    if(message.content.startsWith(`${config.prefix}block`)){
    var args = message.content.split(" ").slice(1)
	  let reason = args.join(" ");
	  if(!reason) reason = `Unspecified.`
	  let user = client.users.fetch(`${support.targetID}`); // djs want a string here
	  const blocked = new Discord.MessageEmbed()
		.setColor("RED").setAuthor(user.tag)
		.setTitle("User blocked")
		.addField("Channel", `<#${message.channel.id}>`, true)
		.addField("Reason", reason, true)
	  if(config.logs){
	    client.channels.cache.get(config.log).send({embed: blocked})
	  }
      let isBlock = await dbTable.get(`isBlocked${support.targetID}`);
      if(isBlock === true) return message.channel.send("The user is already blocked.")
      await dbTable.set(`isBlocked${support.targetID}`, true);
      var c = new Discord.MessageEmbed()
      .setDescription("⏸️ The user has been blocked from the modmail. You may now close the ticket or unblock them to continue.")
      .setColor("RED").setTimestamp()
      message.channel.send({embed: c});
      return;
    }
    
    // complete
    if(message.content.toLowerCase() === `${config.prefix}complete`){
        var embed = new Discord.MessageEmbed()
        .setDescription(`This ticket will be deleted in **10** seconds...\n:lock: This thread has been locked and closed.`)
        .setColor("RED").setTimestamp()
        message.channel.send({embed: embed})
        var timeout = 10000
        setTimeout(() => {end(support.targetID);}, timeout)
      }
      async function end(userID){
        let actualticket = await dbTable.get("ticket");
        message.channel.delete()
        let u = await client.users.fetch(userID);
        let end_log = new Discord.MessageEmbed()
        .setColor("RED").setAuthor(u.tag, u.avatarURL())
        .setDescription(`Ticket #${actualticket} closed.\nUser: ${u.username}\nID: ${userID}`)
        .setTimestamp()
        await dbTable.delete(`support_${userID}`);
      	supportServer.channels.cache.get(config.log).send({embed:end_log});
        return client.users.cache.get(support.targetID).send(`Thanks for getting in touch with us. If you wish to open a new ticket, feel free to message me.\nYour ticket #${actualticket} has been closed.`)
      }
    };
})

client.on("message", async message => {
  if(message.content.startsWith(`${config.prefix}unblock`)){
    if(message.guild.member(message.author).roles.cache.has(config.roles.mod)){
      var args = message.content.split(" ").slice(1);
      client.users.fetch(`${args[0]}`).then(async user => {
      	let data = await dbTable.get(`isBlocked${args[0]}`);
        if(data === true){
          await dbTable.delete(`isBlocked${args[0]}`);
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

client.on("guildMemberRemove", async member => {
  if(config.deleteTicketOnLeave === true){
    let active = await dbTable.get(`support_${message.author.id}`);
    if(active === null) return;
    client.channels.cache.get(active.channelID).delete();
    await dbTable.delete(`support_${message.author.id}`);
    let end_log = new Discord.MessageEmbed()
      .setColor("RED").setAuthor(member.tag, member.avatarURL())
      .setDescription(`Ticket #${actualticket} closed because the user has left the server.\nUser: ${member.username}\nID: ${member.id}`)
      .setTimestamp()
    supportServer.channels.cache.get(config.log).send({embed:end_log});
    return;
  } else return;
})

/*
   just in case:
   the token should not be here.
   the token should be in the 1st line of the process.env file instead.
*/
client.login(process.env.TOKEN); // Log the bot in
