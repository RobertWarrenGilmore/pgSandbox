var bookshelf = require('../database/bookshelf');
var Promise = require('bluebird');
var bcrypt = Promise.promisifyAll(require('bcrypt'));
var Checkit = require('checkit');

var validationRules = {
  emailAddress: ['required', 'email'],
  password: ['minLength:8', 'maxLength:30']
};

var User = bookshelf.Model.extend({
  tableName: 'users',

  initialize: function () {
    this.on('saving', this._validateSave);
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
   */
  setPassword: function (password) {
    Checkit.checkSync('password', password, validationRules.password);
    var passwordHash = bcrypt.hashSync(password, 8);
    this.set('passwordHash', passwordHash);
  },

  /**
   * Validates the password by checking whether it matches the stored password hash.
   * @param {string} password - the password to be validated
   * @returns {boolean} true if the password matches; false otherwise
   */
  validatePassword: function (password) {
    Checkit.checkSync('password', password, validationRules.password);
    var valid = bcrypt.compareSync(password, this.get('passwordHash'));
    return valid;
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
   * Validates the password reset key by checking whether it matches the stored password reset key hash. If validation is successful, then the password reset key hash is cleared.
   * @param {string} passwordResetKey - the password reset key to be validated
   * @returns {boolean} true if the password reset key matches; false otherwise
   */
  validatePasswordResetKey: function (passwordResetKey) {
    var passwordResetKeyHash = this.get('passwordResetKeyHash');
    var keyValid = bcrypt.compareSync(passwordResetKey, passwordResetKeyHash);
    if (keyValid) {
      this.unset('passwordResetKeyHash');
    }
    return keyValid;
  }

});

module.exports = User;
