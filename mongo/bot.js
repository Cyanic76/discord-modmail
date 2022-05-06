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
const config = require("../config.json");
const { paste } = require("ubuntu-pastebin");const { Client, Intents, Permissions, MessageEmbed } = require("discord.js");
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
            
        }
        
    }
});
