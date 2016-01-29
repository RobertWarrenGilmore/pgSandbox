'use strict';
function MalformedRequestError(message) {
  Error.call(this);
  this.name = this.constructor.name;
  this.message = message || 'The request was malformed.';
  this.errorCode = 400;
  Error.captureStackTrace(this, this.constructor);
}
MalformedRequestError.prototype = Object.create(Error.prototype);
MalformedRequestError.prototype.constructor = MalformedRequestError;
module.exports = MalformedRequestError;
