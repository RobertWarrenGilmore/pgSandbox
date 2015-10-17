var authenticatedTransaction = require('./authenticatedTransaction');
var appUrl = require('../../package.json').appUrl;
var AuthenticationError = require('./authenticationError');
var Promise = require('bluebird');
var bcrypt = Promise.promisifyAll(require('bcrypt'));
var appUrl = require('../../package.json').appUrl;
var Checkit = require('checkit');

var derp = {
  validationRules: {
    emailAddress: ['required', 'email'],
    password: ['minLength:8', 'maxLength:30'], // Used by setPassword.
    givenName: ['minLength:1', 'maxLength:30'],
    familyName: ['minLength:1', 'maxLength:30'],
    active: ['required', 'boolean']
  },

  hidden: ['passwordHash', 'passwordResetKeyHash'],

};

function uri(id) {
  return appUrl + '/users/' + 'id';
}

function hashPassword(password) {
  var passwordHash = bcrypt.hashSync(password, 8);
  return passwordHash;
}

function verifyPasswordResetKey(passwordResetKey, hash) {
  var keyValid = bcrypt.compareSync(passwordResetKey, hash);
  return keyValid;
}

function generatePasswordResetKey() {
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

  // Return the key.
  return {
    key: key,
    hash: hash
  };
}

module.exports = function (knex, emailer) {

  var sendPasswordResetEmail = function (address, id, key) {
    var message = 'Set your password at the following URL: ' + appUrl + '/users/' + id + '/setPassword?key=' + key;
    emailer({
      address: address,
      message: message
    });
  };

  return {

    create: function (args) {
      // TODO Catch exceptions and replace them with ones that have error codes?
      var newUser = Object.assign({}, args.body);
      var passwordResetKey = generatePasswordResetKey();
      newUser.passwordResetKeyHash = passwordResetKey.hash;
      // TODO Do validation before insert.

      return knex.transaction(function (trx) {
        return trx
          .into('users')
          .insert(newUser)
          .returning('id');
      }).then(function (id) {
        sendPasswordResetEmail(newUser.emailAddress, id, passwordResetKey.key);
      });
    },

    read: function (args) {
      return authenticatedTransaction(knex, args.auth, function (trx, authUser) {
        // TODO Strip some information depending on who the authUser is.
        var query = trx
          .from('users')
          .select('id', 'emailAddress', 'givenName', 'familyName');
        // TODO Modify the query based on the search or individual user requested.
      });
    },

    update: function (args) {
      var id = args.params.userId;
      var user = Object.assign({}, args.body);
      return authenticatedTransaction(knex, args.auth, function (trx, authUser) {
        if (user.passwordResetKey) {
          if (user.password) {
            if (verifyPasswordResetKey(user.passwordResetKey)) {
              trx
                .from('users')
                .where('id', id)
                .update({
                  passwordHash: hashPassword(user.password),
                  passwordResetKeyHash: null
                });
            } else {
              throw new AuthenticationError('The password reset key was incorrect.');
            }
          } else if (user.passwordResetKey === true) {
            var passwordResetKey = generatePasswordResetKey();
            trx
              .from('users')
              .where('id', id)
              .select('emailAddress')
              .then(function (users) {
                sendPasswordResetEmail(users[0].emailAddress, id, passwordResetKey.key);
              });
          } else {
            // TODO Throw some kind of error for invalid edit.
          }
          delete user.passwordResetKey;
          delete user.password;
        }
        if (authUser.id === id) {
          if (user.password) {
            trx
              .from('users')
              .where('id', id)
              .update({
                passwordHash: hashPassword(user.password),
                passwordResetKeyHash: null
              });
            delete user.password;
          }
          // TODO valiate and perform the general edit.
        } else {
          // TODO Don't throw here if we were doing an anonymous password operation.
          throw new Error('The authenticated user is not the specified user.');
        }
        // TODO gather all of these trx promises and return an .all() of them.
      });

    }
  };
};
