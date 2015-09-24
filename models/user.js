var bookshelf = require('../database/bookshelf');
var Promise = require('bluebird');
var bcrypt = Promise.promisifyAll(require('bcrypt'));

var User = bookshelf.Model.extend({
  tableName: 'users',

  initialize: function () {
    this.on('saving', this.validateSave);
  },

  validateSave: function () {
    if (!this.has('emailAddress')) {
      throw new Error('An email address is required.');
    } else if(!this.get('emailAddress').match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      throw new Error('The email address is in an invalid format.');
    }
  },

  setPassword: function (password) {
    // TODO Check the password reset key and reset the password within a transaction.
    bcrypt.hash(password, 10).then(function (hash) {
      this.set('passwordHash', hash);
    });
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
      return bcrypt.compare(password, user.get('passwordHash'));
    });
  })
});

exports = User;
