function DisallowedMethodError(message) {
  Error.call(this);
  this.name = this.constructor.name;
  /* istanbul ignore next */
  this.message = message || 'That method cannot be performed on this resource.';
  this.errorCode = 405;
  Error.captureStackTrace(this, this.constructor);
}
DisallowedMethodError.prototype = Object.create(Error.prototype);
DisallowedMethodError.prototype.constructor = DisallowedMethodError;
module.exports = DisallowedMethodError;
