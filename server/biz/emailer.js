var nodemailer = require('nodemailer');
var transporter = nodemailer.createTransport();
var Promise = require('bluebird');
var appHost = require('../../package.json').appHost;
var appName = require('../../package.json').name;
var send = Promise.promisify(transporter.sendMail, {
  context: transporter
});

function emailer(recipient, subject, message) {
  return send({
    from: appName + ' <app@' + appHost + '>',
    to: recipient,
    subject: subject,
    text: message
  });
}

module.exports = emailer;
