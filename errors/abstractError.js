'use strict'
class AbstractError extends Error {
  constructor(messageArg /* either a string or {message, messages}*/,
    defaultMessage, errorCode) {
    super(
      (messageArg ? messageArg.message : undefined) ||
      messageArg ||
      defaultMessage
    )
    this.messages = messageArg ? messageArg.messages : undefined
    this.name = this.constructor.name
    this.errorCode = errorCode
    // Error.captureStackTrace(this, this.constructor)
  }
}
module.exports = AbstractError
