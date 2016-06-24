'use strict'
const AbstractError = require('./abstractError')

class ConflictingEditError extends AbstractError {
  constructor(messageArg) {
    super(messageArg, 'The edit that you tried to make conflicted with another edit.', 409)
  }
}
module.exports = ConflictingEditError
