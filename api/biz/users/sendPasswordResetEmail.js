'use strict'
const appHost = require('../../../appInfo.json').host

function sendPasswordResetEmail(emailer, address, key) {
  const subject = 'set your password'
  const message = `Set your password at the following URL: https://${appHost}/setPassword?emailAddress=${address}&key=${key}`
  return emailer(address, subject, message)
}

module.exports = sendPasswordResetEmail
