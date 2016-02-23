'use strict'
const AbstractError = require('./abstractError')
class AuthorisationError extends AbstractError {
  constructor(message) {
    super(message, 'You are not authorised to do that.', 403)
  }
}
module.exports = AuthorisationError
