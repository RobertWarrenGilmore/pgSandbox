'use strict'
const nodemailer = require('nodemailer')
const sparkPostTransport = require('nodemailer-sparkpost-transport')

const Promise = require('bluebird')
const appInfo = require('../appInfo.json')
const sparkPostApiKey = process.env.sparkPostApiKey
const transporter = nodemailer.createTransport(sparkPostTransport({
  sparkPostApiKey: sparkPostApiKey
}))
const send = Promise.promisify(transporter.sendMail, {
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
