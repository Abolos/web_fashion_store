const nodemailer = require("nodemailer");
const config = require("config");
const transporter = nodemailer.createTransport(config.get("mail"));
module.exports = transporter;