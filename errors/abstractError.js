'use strict'
class AbstractError extends Error {
  constructor(messageArg /* either a string or {message, messages}*/,
    defaultMessage, errorCode) {
    const message = (messageArg ? messageArg.message : undefined) ||
      messageArg ||
      defaultMessage
    super(message)
    this.name = this.constructor.name
    this.message = message
    this.messages = messageArg ? messageArg.messages : undefined
    this.errorCode = errorCode
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor)
    } else {
      this.stack = (new Error(message)).stack
    }
  }
}
module.exports = AbstractError
