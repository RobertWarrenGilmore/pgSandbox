'use strict'
const AbstractError = require('./abstractError')
const { ValidationError } = require('../utilities/validate')

class MalformedRequestError extends AbstractError {
  constructor(arg) {
    let message
    if (typeof arg === 'string') {
      message = arg
    } else if (arg instanceof ValidationError) {
      message = arg.message
      this.messages = arg.messages
    }
    super(message, 'The request was malformed.', 400)
  }
}
module.exports = MalformedRequestError
