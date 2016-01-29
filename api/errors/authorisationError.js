'use strict'
function AuthorisationError(message) {
  Error.call(this)
  this.name = this.constructor.name
  this.message = message || 'You are not authorised to do that.'
  this.errorCode = 403
  Error.captureStackTrace(this, this.constructor)
}
AuthorisationError.prototype = Object.create(Error.prototype)
AuthorisationError.prototype.constructor = AuthorisationError
module.exports = AuthorisationError
