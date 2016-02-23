'use strict'
const appHost = require('../../../appInfo.json').host

const uri = id => `https://${appHost}/users/${id}`

function sendPasswordResetEmail(emailer, address, id, key) {
  const subject = 'set your password'
  const message = `Set your password at the following URL: ${uri(id)}/setPassword?key=${key}`
  return emailer(address, subject, message)
}

module.exports = sendPasswordResetEmail
