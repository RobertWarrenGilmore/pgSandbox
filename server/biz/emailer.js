var nodemailer = require('nodemailer');
var transporter = nodemailer.createTransport();
var Promise = require('bluebird');
var appHost = require('../../package.json').appHost;
var send = Promise.promisify(transporter.sendMail);

function emailer(recipient, subject, message) {
  return send({
    from: 'app@' + appHost,
    to: recipient,
    subject: subject,
    text: message
  });
}

module.exports = emailer;
