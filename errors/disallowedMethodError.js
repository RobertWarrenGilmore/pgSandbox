'use strict'
const AbstractError = require('./abstractError')
class DisallowedMethodError extends AbstractError {
  constructor(message) {
    super(message, 'That method cannot be performed on this resource.', 405)
  }
}
module.exports = DisallowedMethodError
