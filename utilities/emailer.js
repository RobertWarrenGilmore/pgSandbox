'use strict'
const nodemailer = require('nodemailer')
const sparkPostTransport = require('nodemailer-sparkpost-transport')

const appInfo = require('../appInfo.json')
const sparkPostApiKey = process.env.sparkPostApiKey
const transporter = nodemailer.createTransport(sparkPostTransport({
  sparkPostApiKey
}))

function emailer(recipient, subject, message) {
  if (process.env.NODE_ENV === 'production') {
    return new Promise((resolve, reject) => {
      transporter.sendMail({
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
          subject,
          text: message
        }
      }, (err, result) => {
        if (err)
          reject(err)
        else
          resolve(result)
      })
    })
  } else {
    console.info('Pretended to send an email.', recipient, subject, message)
    return Promise.resolve()
  }
}

module.exports = emailer
