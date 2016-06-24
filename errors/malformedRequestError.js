'use strict'
const AbstractError = require('./abstractError')

class MalformedRequestError extends AbstractError {
  constructor(messageArg) {
    super(messageArg, 'The request was malformed.', 400)
  }
}
module.exports = MalformedRequestError
