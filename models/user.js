var bookshelf = require('../database/bookshelf');
var Promise = require('bluebird');
var bcrypt = Promise.promisifyAll(require('bcrypt'));
var Checkit = require('checkit');

var validationRules = new Checkit({
  emailAddress: ['required', 'email'],
  password: ['minLength:8', 'maxLength:30']
});

var User = bookshelf.Model.extend({
  tableName: 'users',

  initialize: function () {
    this.on('saving', this.validateSave);
  },

  validateSave: function ( /*model, attrs, options*/ ) {
    var self = this;
    return validationRules.run(this.attributes).then(function () {
      if (self.hasChanged('password')) {
        // TODO Check the password reset key and reset the password within a transaction. This might require that we check whether the current save action is in a transaction. If there is no transaction (in options.transacting), then fail the password change. If there is, then add the check of the password reset key onto the same transaction.
        return bcrypt.hashAsync(self.get('password'), 8).then(function (hash) {
          self.set('passwordHash', hash);
          self.unset('password'); // We don't store the actual password.
        });
      }
    });
  },

  generatePasswordResetKey: function () {
    // Generate a random alphanumeric key of length 30.
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var length = 30;
    var key = [];
    for (var i = 0; i < length; ++i) {
      key.push(possible.charAt(Math.floor(Math.random() * possible.length)));
    }
    key = key.join('');

    // Save a hash of the key.
    var self = this;
    return bcrypt.hashAsync(key, 8).then(function (hash) {
      self.set('passwordResetKeyHash', hash);

      // Return the key.
      return key;
    });
  }

}, {

  authenticate: Promise.method(function (emailAddress, password) {
    if (!emailAddress || !password) {
      throw new Error('Email address and password are both required.');
    }
    return new this({
      emailAddress: emailAddress.toLowerCase().trim()
    }).fetch({
      require: true // Reject if there is no such user.
    }).then(function (user) {
      // Reject if the password doesn't match.
      return bcrypt.compareAsync(password, user.get('passwordHash')).then(
        function (valid) {
          if (valid) {
            return user;
          } else {
            throw new Error('The password was incorrect.');
          }
        }
      ).catch(function () {
        throw new Error('Password verification failed. The password might not be set.');
      });
    });
  })
});

module.exports = User;
