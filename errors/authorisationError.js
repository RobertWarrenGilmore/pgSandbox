'use strict'
const AbstractError = require('./abstractError')

class AuthorisationError extends AbstractError {
  constructor(messageArg) {
    super(messageArg, 'You are not authorised to do that.', 403)
  }
}
module.exports = AuthorisationError
