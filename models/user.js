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

  validateSave: function (/*model, attrs, options*/) {
    validationRules.run(this.attributes);
    if (this.hasChanged('password')) {
      // TODO Check the password reset key and reset the password within a transaction. This might require that we check whether the current save action is in a transaction. If there is no transaction (in options.transacting), then fail the password change. If there is, then add the check of the password reset key onto the same transaction.
      var self = this;
      return bcrypt.hashAsync(this.get('password'), 10).then(function (hash) {
        self.set('passwordHash', hash);
        self.unset('password'); // We don't store the actual password.
      });
    }
  }

}, {

  login: Promise.method(function (email, password) {
    if (!email || !password) {
      throw new Error('Email and password are both required.');
    }
    return new this({
      email: email.toLowerCase().trim()
    }).fetch({
      require: true // Reject if there is no such user.
    }).tap(function (user) { // Reject if the password doesn't match.
      return bcrypt.compareAsync(password, user.get('passwordHash'));
    });
  })
});

module.exports = User;
