'use strict'
const AbstractError = require('./abstractError')

class AuthenticationError extends AbstractError {
  constructor(messageArg) {
    super(messageArg, 'Authentication failed.', 418) // IE mishandles 401.
  }
}
module.exports = AuthenticationError
