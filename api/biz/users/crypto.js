'use strict'
var Promise = require('bluebird')
var bcrypt = Promise.promisifyAll(require('bcrypt'))

function hashPassword(password) {
  var passwordHash = bcrypt.hashSync(password, 8)
  return passwordHash
}

function verifyPasswordResetKey(passwordResetKey, hash) {
  var keyValid = bcrypt.compareSync(passwordResetKey, hash)
  return keyValid
}

function generatePasswordResetKey() {
  // Generate a random alphanumeric key of length 30.
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  var length = 30
  var key = []
  for (var i = 0; i < length; ++i) {
    key.push(possible.charAt(Math.floor(Math.random() * possible.length)))
  }
  key = key.join('')

  // Store a hash of the key.
  var hash = bcrypt.hashSync(key, 8)

  // Return the key.
  return {
    key: key,
    hash: hash
  }
}

module.exports = {
  hashPassword: hashPassword,
  verifyPasswordResetKey: verifyPasswordResetKey,
  generatePasswordResetKey: generatePasswordResetKey
}
