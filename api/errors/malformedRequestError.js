'use strict'
const AbstractError = require('./abstractError')
class MalformedRequestError extends AbstractError {
  constructor(message) {
    super(message, 'The request was malformed.', 400)
  }
}
module.exports = MalformedRequestError
