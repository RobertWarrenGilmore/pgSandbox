'use strict'
var appHost = require('../../../appInfo.json').host

function uri(id) {
  return 'https://' + appHost + '/users/' + id
}

function sendPasswordResetEmail(emailer, address, id, key) {
  var subject = 'set your password'
  var message = 'Set your password at the following URL: ' + uri(id) + '/setPassword?key=' + key
  return emailer(address, subject, message)
}

module.exports = sendPasswordResetEmail
