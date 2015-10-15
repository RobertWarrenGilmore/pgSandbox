function AuthenticationError(message) {
  this.name = 'AuthenticationError';
  this.message = this.name + ': ' + (message || 'Authentication failed.');
  this.stack = (new Error()).stack;
};
AuthenticationError.prototype = Object.create(Error.prototype);
AuthenticationError.prototype.constructor = AuthenticationError;
module.exports = AuthenticationError;
