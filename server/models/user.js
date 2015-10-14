var bookshelf = require('../database/bookshelf');
var Promise = require('bluebird');
var bcrypt = Promise.promisifyAll(require('bcrypt'));
var appUrl = require('../../package.json').appUrl;
var Checkit = require('checkit');

var validationRules = {
  emailAddress: ['required', 'email'],
  password: ['minLength:8', 'maxLength:30'], // Used by setPassword.
  givenName: ['minLength:1', 'maxLength:30'],
  familyName: ['minLength:1', 'maxLength:30'],
  active: ['required', 'boolean']
};

var User = bookshelf.Model.extend({
  tableName: 'users',

  hidden: ['passwordHash', 'passwordResetKeyHash'],

  virtuals: {
    uri: function () {
      return appUrl + '/users/' + this.get('id');
    }
  },

  initialize: function () {
    this.on('creating', this._setActive);
    this.on('saving', this._validateSave);
  },

  _setActive: function() {
    this.set('active', true);
  },

  _validateSave: function () {
    var validation = new Checkit(validationRules);
    var fieldValidationPromise = validation.run(this.attributes);
    return fieldValidationPromise;
  },

  /**
   * Sets the password by storing its hash. The password itself is not stored.
   * @param {string} password - the new password to be set
   * @returns {void}
   * @throws if the password is not between 8 and 30 (inclusive) in length.
   */
  setPassword: function (password) {
    var validationResult = Checkit.checkSync('password', password, validationRules.password);
    var err = validationResult[0];
    if (err) {
      throw err;
    } else {
      var passwordHash = bcrypt.hashSync(password, 8);
      this.set('passwordHash', passwordHash);
    }
  },

  /**
   * Verifies the password by checking whether it matches the stored password hash.
   * @param {string} password - the password to be verified
   * @returns {boolean} true if the password matches; false otherwise
   * @throws if the password is not between 8 and 30 (inclusive) in length.
   */
  verifyPassword: function (password) {
    var validationResult = Checkit.checkSync('password', password, validationRules.password);
    var err = validationResult[0];
    if (err) {
      throw err;
    } else {
      var valid = bcrypt.compareSync(password, this.get('passwordHash'));
      return valid;
    }
  },

  /**
   * Generates a password reset key (an alphanumeric string of length 30) and stores its hash. The key itself is returned but not stored.
   * @returns {string} the generated key
   */
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
  },

  /**
   * Verifies the password reset key by checking whether it matches the stored password reset key hash. If verification is successful, then the password reset key hash is cleared.
   * @param {string} passwordResetKey - the password reset key to be verified
   * @returns {boolean} true if the password reset key matches; false otherwise
   */
  verifyPasswordResetKey: function (passwordResetKey) {
    var passwordResetKeyHash = this.get('passwordResetKeyHash');
    var keyValid = bcrypt.compareSync(passwordResetKey, passwordResetKeyHash);
    if (keyValid) {
      this.set('passwordResetKeyHash', null);
    }
    return keyValid;
  }

});

module.exports = bookshelf.model('User', User);
