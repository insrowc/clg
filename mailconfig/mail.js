const nodemailer = require("nodemailer");

var transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: process.env.SENDER_EMAIL,
      pass: process.env.PASS,
    },
  });

  module.exports = transporter;