function AuthenticationError(message) {
  Error.call(this);
  this.name = this.constructor.name;
  this.message = message || 'Authentication failed.';
  Error.captureStackTrace(this, this.constructor);
}
AuthenticationError.prototype = Object.create(Error.prototype);
AuthenticationError.prototype.constructor = AuthenticationError;
module.exports = AuthenticationError;
