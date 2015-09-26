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

  validateSave: function () {
    var self = this;
    var fieldValidationPromise = validationRules.run(this.attributes);

    // If there is a password and a valid password reset key, then set the password hash.
    var passwordReset = function () {
      if (self.has('password')) {
        if (self.has('passwordResetKey')) {
          var keyValid = bcrypt.compareSync(self.get('passwordResetKey'), self.get('passwordResetKeyHash'));
          if (keyValid) {
            var password = self.get('password');
            var passwordHash = bcrypt.hashSync(password, 8);
            self.set('passwordHash', passwordHash);
          } else {
            throw new Error('The password reset key was invalid.');
          }
        } else {
          throw new Error('A password reset key must be provided in order to change the password.');
        }
        self.unset('password'); // This field doesn't get saved.
      }
      self.unset('passwordResetKey'); // This field doesn't get saved.
    }.bind(this);

    return fieldValidationPromise.then(passwordReset);
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

    // Store a hash of the key.
    var hash = bcrypt.hashSync(key, 8);
    this.set('passwordResetKeyHash', hash);

    // Return the key.
    return key;
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
