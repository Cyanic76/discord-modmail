const { Schema , model } = require("mongoose");

const userSchema = new Schema({
  ticket: {type: Number, required: true},
  target: {type: Number, required: true},
  channel: {type: Number, required: true},
})

const channelSchema = new Schema({
  author: {type: Number, required: true}
})

const ticketSchema = new Schema({
  number: {type: Number, required: false, default: 0}
})

const User = model("Users", userSchema);
const Channel = model("Channels", channelSchema);
const Ticket = model("Ticket", ticketSchema);

module.exports = {User,Channel,Ticket}
