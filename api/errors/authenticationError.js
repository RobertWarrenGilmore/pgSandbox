'use strict'
const AbstractError = require('./abstractError')
class AuthenticationError extends AbstractError {
  constructor(message) {
    super(message, 'Authentication failed.', 400)
  }
}
module.exports = AuthenticationError
