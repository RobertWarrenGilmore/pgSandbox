'use strict'
const AbstractError = require('./abstractError')

class ServerError extends AbstractError {
  constructor(messageArg) {
    super(messageArg, 'There was an unforeseen problem on our server. Oops.', 500)
  }
}
module.exports = ServerError
