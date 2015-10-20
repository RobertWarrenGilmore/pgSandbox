var authenticatedTransaction = require('./authenticatedTransaction');
var appUrl = require('../../package.json').appUrl;
var AuthenticationError = require('../errors/authenticationError');
var AuthorisationError = require('../errors/authorisationError');
var NoSuchResourceError = require('../errors/noSuchResourceError');
var MalformedRequestError = require('../errors/malformedRequestError');
var Promise = require('bluebird');
var bcrypt = Promise.promisifyAll(require('bcrypt'));
var appUrl = require('../../package.json').appUrl;
var Checkit = require('checkit');

var validationRules = new Checkit({
  emailAddress: ['email'],
  password: ['minLength:8', 'maxLength:30'],
  givenName: ['minLength:1', 'maxLength:30'],
  familyName: ['minLength:1', 'maxLength:30'],
  active: ['boolean']
});
var readableAttributes = ['id', 'emailAddress', 'givenName', 'familyName', 'active'];
var creatableAttributes = ['emailAddress', 'givenName', 'familyName'];
var updatableAttributes = ['emailAddress', 'givenName', 'familyName', 'password', 'active'];

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

function acceptOnlyAttributes(object, acceptible, error) {
  for (var key in object) {
    if (acceptible.indexOf(key) === -1) {
      throw error(key);
    }
  }
}

module.exports = function (knex, emailer) {

  var sendPasswordResetEmail = function (address, id, key) {
    var message = 'Set your password at the following URL: ' + uri(id) + '/setPassword?key=' + key;
    emailer(address, message);
  };

  return {

    create: function (args) {
      var newUser = Object.assign({}, args.body);
      acceptOnlyAttributes(newUser, creatableAttributes, function (key) {
        return new MalformedRequestError('The attribute ' + key + ' cannot be written during a user creation.');
      });
      var passwordResetKey = generatePasswordResetKey();
      newUser.passwordResetKeyHash = passwordResetKey.hash;
      // TODO Do validation before insert.
      return validationRules.run(newUser)
        .then(function (validated) {
          if (!validated) {
            throw new MalformedRequestError();
          }
        })
        .then(function () {
          return knex.transaction(function (trx) {
            return trx
              .into('users')
              .insert(newUser)
              .returning('id');
          });
        })
        .then(function (id) {
          sendPasswordResetEmail(newUser.emailAddress, id, passwordResetKey.key);
        });
    },

    read: function (args) {
      return authenticatedTransaction(knex, args.auth, function (trx, authUser) {
        // TODO Strip some information depending on who the authUser is.
        return trx
          .from('users')
          .select(readableAttributes);
        // TODO Modify the query based on the search or individual user requested.
      });
    },

    update: function (args) {
      var id = args.params.userId;
      var newUser = Object.assign({}, args.body);
      return validationRules.run(newUser)
        .then(function (validated) {
          if (!validated) {
            throw new MalformedRequestError();
          }
        })
        .then(function () {
          return authenticatedTransaction(knex, args.auth, function (trx, authUser) {
            return trx
              .from('users')
              .where('id', id)
              .select()
              .then(function (users) {
                console.log(users)
                if (!users.length) {
                  throw new NoSuchResourceError();
                }
                var oldUser = users[0];

                acceptOnlyAttributes(newUser, updatableAttributes, function (key) {
                  return new Error('The attribute ' + key + ' cannot be written.');
                });

                // normal, authenticated user update
                if (authUser) {
                  if (authUser.id !== id) {
                    throw new AuthorisationError();
                  }
                  if (newUser.password) {
                    newUser.passwordHash = hashPassword(newUser.password);
                    newUser.passwordResetKeyHash = null;
                  }
                  delete newUser.password;
                  return trx
                    .from('users')
                    .where('id', id)
                    .update(newUser);

                  // setting password using a password reset key
                } else if (newUser.password) {
                  acceptOnlyAttributes(newUser, ['password', 'passwordResetKey'], function (key) {
                    return new MalformedRequestError('The attribute ' + key + ' cannot be written during an anonymous password reset.');
                  });
                  if (!newUser.passwordResetKey || !verifyPasswordResetKey(newUser.passwordResetKey, oldUser.passwordResetKeyHash)) {
                    throw new AuthenticationError();
                  }
                  return trx.from('users'.where('id', id).update({
                    passwordHash: hashPassword(newUser.password),
                    passwordResetKeyHash: null
                  }));

                  // generating a new password reset key
                } else if (newUser.passwordResetKey === true) {
                  acceptOnlyAttributes(newUser, ['passwordResetKey'], function (key) {
                    return new MalformedRequestError('The attribute ' + key + ' cannot be written during an anonymous password reset key generation.');
                  });
                  return trx.from('users'.where('id', id).update({
                    passwordResetKeyHash: generatePasswordResetKey()
                  }));

                  // Those are the only options. Otherwise, throw.
                } else {
                  throw new AuthenticationError();
                }

              });
          });
        });

      // TODO gather all of these trx promises and return an Promise.all() of them.
    }
  };
};
