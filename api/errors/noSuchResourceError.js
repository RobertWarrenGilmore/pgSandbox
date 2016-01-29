'use strict'
function NoSuchResourceError(message) {
  Error.call(this)
  this.name = this.constructor.name
  this.message = message || 'The resource was not found.'
  this.errorCode = 404
  Error.captureStackTrace(this, this.constructor)
}
NoSuchResourceError.prototype = Object.create(Error.prototype)
NoSuchResourceError.prototype.constructor = NoSuchResourceError
module.exports = NoSuchResourceError
