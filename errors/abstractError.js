'use strict'
class AbstractError extends Error {
  constructor(message, defaultMessage, errorCode) {
    super(message)
    this.name = this.constructor.name
    this.message = message || defaultMessage
    this.errorCode = errorCode
    // Error.captureStackTrace(this, this.constructor)
  }
}
module.exports = AbstractError
