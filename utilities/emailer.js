'use strict'
var nodemailer = require('nodemailer')
var sparkPostTransport = require('nodemailer-sparkpost-transport')

var Promise = require('bluebird')
var appInfo = require('../appInfo.json')
var sparkPostApiKey = process.env.sparkPostApiKey
var transporter = nodemailer.createTransport(sparkPostTransport({
  sparkPostApiKey: sparkPostApiKey
}))
var send = Promise.promisify(transporter.sendMail, {
  context: transporter
})

function emailer(recipient, subject, message) {
  if (process.env.NODE_ENV === 'production') {
    return send({
      recipients: [{
        address: {
          email: recipient
        }
      }],
      content: {
        from: {
          name: appInfo.name,
          email: 'app@' + appInfo.host
        },
        subject: subject,
        text: message
      }
    })
  } else {
    console.info('Pretended to send an email.', recipient, subject, message)
    return Promise.resolve()
  }
}

module.exports = emailer
