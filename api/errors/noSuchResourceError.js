'use strict'
const AbstractError = require('./abstractError')
class NoSuchResourceError extends AbstractError {
  constructor(message) {
    super(message, 'The resource was not found.', 404)
  }
}
module.exports = NoSuchResourceError
