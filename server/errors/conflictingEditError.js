function ConflictingEditError(message) {
  Error.call(this);
  this.name = this.constructor.name;
  this.message = message || 'The edit that you tried to make conflicted with another edit.';
  this.errorCode = 409;
  Error.captureStackTrace(this, this.constructor);
}
ConflictingEditError.prototype = Object.create(Error.prototype);
ConflictingEditError.prototype.constructor = ConflictingEditError;
module.exports = ConflictingEditError;
