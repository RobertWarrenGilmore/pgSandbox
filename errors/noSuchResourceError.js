'use strict'
const AbstractError = require('./abstractError')

class NoSuchResourceError extends AbstractError {
  constructor(messageArg) {
    super(messageArg, 'The resource was not found.', 404)
  }
}
module.exports = NoSuchResourceError
