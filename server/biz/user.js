var authenticatedTransaction = require('./authenticatedTransaction');
var appHost = require('../../appInfo.json').host;
var AuthenticationError = require('../errors/authenticationError');
var AuthorisationError = require('../errors/authorisationError');
var NoSuchResourceError = require('../errors/noSuchResourceError');
var MalformedRequestError = require('../errors/malformedRequestError');
var ConflictingEditError = require('../errors/conflictingEditError');
var Promise = require('bluebird');
var bcrypt = Promise.promisifyAll(require('bcrypt'));
var Checkit = require('checkit');
var escapeForLike = require('./escapeForLike');

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
var searchableParams = ['emailAddress', 'givenName', 'familyName'];

function uri(id) {
  return 'https://' + appHost + '/users/' + id;
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
  return new Promise(function (resolve, reject) {
    for (var attribute in object) {
      if (acceptible.indexOf(attribute) === -1) {
        reject(error(attribute));
      }
    }
    resolve();
  });
}

function authenticatedUpdate(authUser, trx, id, newUser) {
  // Reject bad attributes.
  return acceptOnlyAttributes(newUser, updatableAttributes,
      function (attribute) {
        return new MalformedRequestError('The attribute ' + attribute + ' cannot be written.');
      }
    ).then(function () {

      // Get the existing user.
      return trx
        .from('users')
        .where('id', id)
        .select();
    })
    .then(function (users) {
      if (!users.length) {
        throw new NoSuchResourceError();
      }
      // var oldUser = users[0];

      // Reject unauthorised updates.
      if (authUser.id != id) {
        throw new AuthorisationError();
      }

      // Handle the password specially, by hashing it.
      if (newUser.password) {
        newUser.passwordHash = hashPassword(newUser.password);
        newUser.passwordResetKeyHash = null;
      }
      delete newUser.password;

      // Do the update.
      return trx
        .from('users')
        .where('id', id)
        .update(newUser)
        .returning(readableAttributes)
        .then(function (rows) {
          return rows[0];
        });
    });
}

function anonymousPasswordUpdate(trx, id, newUser) {

  // Reject attributes other than passwordResetKey and password.
  return acceptOnlyAttributes(newUser, ['password', 'passwordResetKey'],
    function (attribute) {
      throw new MalformedRequestError('The attribute ' + attribute + ' cannot be written during an anonymous password reset.');
    }
  ).then(function () {

    // Get the existing user.
    return trx
      .from('users')
      .where('id', id)
      .select();
  }).then(function (users) {
    if (!users.length) {
      throw new NoSuchResourceError();
    }
    var oldUser = users[0];

    // Verify the provided password reset key against the hash in the existing user.
    if (!newUser.passwordResetKey || !oldUser.passwordResetKeyHash || !verifyPasswordResetKey(newUser.passwordResetKey, oldUser.passwordResetKeyHash)) {
      throw new AuthenticationError();
    }

    // Do the update.
    return trx
      .from('users')
      .where('id', id)
      .update({
        passwordHash: hashPassword(newUser.password),
        passwordResetKeyHash: null
      })
      .returning(readableAttributes)
      .then(function (rows) {
        return rows[0];
      });
  });
}

function anonymousPasswordResetKeyUpdate(trx, newUser, emailer) {
  var key;

  // Reject attributes other than passwordResetKey and emailAddress.
  return acceptOnlyAttributes(newUser, ['passwordResetKey', 'emailAddress'],
      function (attribute) {
        throw new MalformedRequestError('The attribute ' + attribute + ' cannot be written during an anonymous password reset key generation.');
      }
    ).then(function () {

      // Generate a key.
      key = generatePasswordResetKey();

      // Set the key hash.
      return trx
        .from('users')
        .where('emailAddress', 'ilike', escapeForLike(newUser.emailAddress))
        .update({
          passwordResetKeyHash: key.hash
        });
    })
    // Send the user an email with the key.
    .then(function () {
      return trx.from('users').where('emailAddress', 'ilike', escapeForLike(newUser.emailAddress)).select('id');
    })
    .tap(function (users) {
      if (users.length) {
        var oldUser = users[0];
        return sendPasswordResetEmail(emailer, newUser.emailAddress, oldUser.id, key.key);
      } else {
        throw new NoSuchResourceError();
      }
    })
    .then(function (users) {
      return users[0];
    });
}

function sendPasswordResetEmail(emailer, address, id, key) {
  var subject = 'set your password';
  var message = 'Set your password at the following URL: ' + uri(id) + '/setPassword?key=' + key;
  return emailer(address, subject, message);
}

module.exports = function (knex, emailer) {

  return {

    create: function (args) {
      var newUser = Object.assign({}, args.body);
      var key;
      var absentEmailAddressError = new MalformedRequestError('You must supply an email address to create a user.');
      var notUniqueEmailAddressError = new ConflictingEditError('That email address is already in use by another user.');
      return acceptOnlyAttributes(newUser, creatableAttributes,
        function (attribute) {
          return new MalformedRequestError('The attribute ' + attribute + ' cannot be written during a user creation.');
        }
      ).then(function () {
        if (!newUser.emailAddress) {
          throw absentEmailAddressError;
        }
        key = generatePasswordResetKey();
        newUser.passwordResetKeyHash = key.hash;
        return validationRules.run(newUser);
      }).then(function () {
        return knex.transaction(function (trx) {
          return trx
            .from('users')
            .select(['id', 'emailAddress'])
            .where('emailAddress', 'ilike', escapeForLike(newUser.emailAddress))
            .then(function (existingUsers) {
              if (existingUsers && existingUsers.length) {
                throw notUniqueEmailAddressError;
              }
              return trx
                .into('users')
                .insert(newUser)
                .returning('id');
            })
            .tap(function (ids) {
              return sendPasswordResetEmail(emailer, newUser.emailAddress, ids[0], key.key);
            })
            .then(function (ids) {
              return {
                id: ids[0]
              };
            });
        });
      }).catch(Checkit.Error, function (err) {
        var message = '';
        for (var attribute in err.errors) {
          message += err.errors[attribute].message + '. ';
        }
        message = message.trim();
        throw new MalformedRequestError(message);
      }).catch(function (err) {
        return err.code === '23502';
      }, function (err) {
        throw absentEmailAddressError;
      }).catch(function (err) {
        return err.code === '23505';
      }, function (err) {
        throw notUniqueEmailAddressError;
      });
    },

    read: function (args) {
      return authenticatedTransaction(knex, args.auth, function (trx, authUser) {

        if (args.params && Object.keys(args.params).length && args.query && Object.keys(args.query).length) {
          return Promise.reject(new MalformedRequestError('A read against a specific user cannot filter by any other parameters.'));
        }

        if (args.params && args.params.userId) {
          // Read a specific user.
          return trx
            .from('users')
            .where('id', args.params.userId)
            .select(readableAttributes).then(function (users) {
              if (!users.length) {
                throw new NoSuchResourceError();
              }
              return users[0];
            });
        } else {

          // Create a query for a search.
          var query = trx
            .from('users')
            .select(readableAttributes);

          // Add sorting.
          if (args.query && args.query.sortBy) {
            var sortBy = args.query.sortBy;
            if (searchableParams.indexOf(sortBy) === -1) {
              return Promise.reject(new MalformedRequestError('Cannot sort by ' + sortBy + '.'));
            }
            var sortOrder = 'asc';
            if (args.query.sortOrder === 'descending') {
              sortOrder = 'desc';
            }
            query = query.orderBy(sortBy, sortOrder);
          }

          // Add search parameters.
          var searchParams = Object.assign({}, args.query);
          delete searchParams.sortBy;
          delete searchParams.sortOrder;
          return acceptOnlyAttributes(searchParams, searchableParams, function (attribute) {
            return new MalformedRequestError('Cannot filter by parameter ' + attribute + '.');
          }).then(function () {
            if (searchParams.givenName) {
              query = query.where('givenName', 'ilike', escapeForLike(searchParams.givenName) + '%');
              delete searchParams.givenName;
            }
            if (searchParams.familyName) {
              query = query.where('familyName', 'ilike', escapeForLike(searchParams.familyName) + '%');
              delete searchParams.familyName;
            }
            if (searchParams.emailAddress) {
              query = query.where('emailAddress', 'ilike', escapeForLike(searchParams.emailAddress) + '%');
              delete searchParams.emailAddress;
            }
            query = query.where(searchParams);

            // The query is finished. Return it.
            return query;
          });
        }
      }).then(function (result) {
        return JSON.parse(JSON.stringify(result));
      });
    },

    update: function (args) {
      var id;
      if (args.params) {
        id = args.params.userId;
      }
      var newUser = Object.assign({}, args.body);

      return validationRules.run(newUser)
        .then(function () {
          return authenticatedTransaction(knex, args.auth, function (trx, authUser) {

            // normal, authenticated user update
            if (authUser) {
              return authenticatedUpdate(authUser, trx, id, newUser);

              // setting password using a password reset key
            } else if (newUser.password) {
              return anonymousPasswordUpdate(trx, id, newUser);

              // generating a new password reset key
            } else if (newUser.passwordResetKey === true) {
              return anonymousPasswordResetKeyUpdate(trx, newUser, emailer);

              // Those are the only options. Otherwise, throw.
            } else {
              throw new AuthenticationError();
            }
          });

        })
        .then(function (user) {
          if (user instanceof Object) {
            return JSON.parse(JSON.stringify(user));
          }
        })
        .catch(Checkit.Error, function (err) {
          var message = '';
          for (var key in err.errors) {
            message += err.errors[key].message + '. ';
          }
          message = message.trim();
          throw new MalformedRequestError(message);
        });
    }
  };
};
