'use strict'
const bcrypt = require('bcrypt')

const hashPassword = password =>
  bcrypt.hashSync(password, bcrypt.genSaltSync(8))

const verifyPasswordResetKey = (passwordResetKey, hash) =>
  bcrypt.compareSync(passwordResetKey, hash)

function generatePasswordResetKey() {
  // Generate a random alphanumeric key of length 30.
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const length = 30
  let key = []
  for (let i = 0; i < length; ++i) {
    key.push(possible.charAt(Math.floor(Math.random() * possible.length)))
  }
  key = key.join('')

  // Store a hash of the key.
  const hash = hashPassword(key)

  // Return the key.
  return {
    key,
    hash
  }
}

module.exports = {
  hashPassword,
  verifyPasswordResetKey,
  generatePasswordResetKey
}
