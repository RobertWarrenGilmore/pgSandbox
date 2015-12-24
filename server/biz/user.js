var _ = require('lodash');
var appHost = require('../../appInfo.json').host;
var AuthenticationError = require('../errors/authenticationError');
var AuthorisationError = require('../errors/authorisationError');
var NoSuchResourceError = require('../errors/noSuchResourceError');
var MalformedRequestError = require('../errors/malformedRequestError');
var ConflictingEditError = require('../errors/conflictingEditError');
var Promise = require('bluebird');
var bcrypt = Promise.promisifyAll(require('bcrypt'));
var authenticatedTransaction = require('./utilities/authenticatedTransaction');
var escapeForLike = require('./utilities/escapeForLike');
var validate = require('./utilities/validate');

var readableAttributes = ['id', 'emailAddress', 'givenName', 'familyName', 'active'];

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

function authenticatedUpdate(authUser, trx, id, body) {
  // Reject unauthorised updates.
  if (authUser.id !== id) {
    throw new AuthorisationError();
  }

  return validate(body, {
    emailAddress: [
      'email',
      // Check for case-insensitive uniqueness of email address.
      function (val) {
        return trx
          .from('users')
          .select(['id', 'emailAddress'])
          .where('emailAddress', 'ilike', escapeForLike(val))
          .then(function (existingUsers) {
            if (existingUsers && existingUsers.length) {
              throw new ConflictingEditError('That email address is already in use by another user.');
            }
          });
      }
    ],
    password: [
      'minLength:8',
      'maxLength:30'
    ],
    givenName: [
      'minLength:1',
      'maxLength:30'
    ],
    familyName: ['minLength:1', 'maxLength:30'],
    active: ['boolean']
  }).then(function() {
    // Get the existing user.
    return trx
      .from('users')
      .where('id', id)
      .select();
  }).then(function (users) {
    if (!users.length) {
      throw new NoSuchResourceError();
    }

    var newUser = _.cloneDeep(body);

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
  return validate(newUser, {
    password: [
      'required',
      'minLength:8',
      'maxLength:30'],
    passwordResetKey: [
      'required',
      'exactLength:30',
      'alphaNumeric'
    ]
  }).then(function () {
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
      .returning(readableAttributes);
  }).then(function (rows) {
    return rows[0];
  });
}

function anonymousPasswordResetKeyUpdate(emailer, trx, body) {
  return validate(body, {
    passwordResetKey: [
      'exists',
      'null'
    ],
    emailAddress: [
      'required',
      'email'
    ]
  }).then(function () {

    // Generate a key.
    var key = generatePasswordResetKey();

    // Set the key hash.
    return trx
      .from('users')
      .where('emailAddress', 'ilike', escapeForLike(body.emailAddress))
      .update({
        passwordResetKeyHash: key.hash
      }).returning(['id', 'emailAddress']).then(function (rows) {
        if (rows.length === 0) {
          throw new NoSuchResourceError();
        }
        return {
          id: rows[0].id,
          emailAddress: rows[0].emailAddress,
          key: key.key
        };
      });

  // Send the user an email with the key.
  }).tap(function (user) {
    return sendPasswordResetEmail(emailer, user.emailAddress, user.id, user.key);
  }).then(function (users) {
    return null;
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
      return authenticatedTransaction(knex, args.auth, function (trx, authUser) {
        return validate(args.body, {
          emailAddress: [
            'required',
            'email',
            // Check for case-insensitive uniqueness of email address.
            function (val) {
              return trx
                .from('users')
                .select(['id', 'emailAddress'])
                .where('emailAddress', 'ilike', escapeForLike(val))
                .then(function (existingUsers) {
                  if (existingUsers && existingUsers.length) {
                    throw new ConflictingEditError('That email address is already in use by another user.');
                  }
                });
            }
          ],
          givenName: ['minLength:1', 'maxLength:30'],
          familyName: ['minLength:1', 'maxLength:30']
        }).then(function () {

          // Set the password reset key.
          var key = generatePasswordResetKey();

          // Do the insertion.
          return trx
            .into('users')
            .insert(_.merge(args.body, {
              passwordResetKeyHash: key.hash
            })).returning([
              'id',
              'emailAddress'
            ]).then(function (rows) {
              return {
                id: rows[0],
                emailAddress: args.body.emailAddress,
                key: key.key
              };
            });
        }).tap(function (user) {

          // Send the password reset email. Note that the transaction can still fail at this point.
          return sendPasswordResetEmail(emailer, user.emailAddress, user.id, user.key);
        }).then(function (ids) {

          // Respond withan object containing only the ID.
          return {
            id: ids[0]
          };
        });
      });
    },

    read: function (args) {
      return authenticatedTransaction(knex, args.auth, function (trx, authUser) {

        if (args.params && Object.keys(args.params).length && args.query && Object.keys(args.query).length) {
          throw new MalformedRequestError('A read against a specific user cannot filter by any other parameters.');
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

          // Query a list of users.
          return validate(_.clone(args.query) || {}, {
            emailAddress: [],
            givenName: [],
            familyName: [],
            sortBy: [
              function (val) {
                var legalValues = [
                  'emailAddress',
                  'givenName',
                  'familyName'
                ];
                if (legalValues.indexOf(val) === -1) {
                  throw new MalformedRequestError('Users cannot be sorted by ' + val + '.');
                }
              }
            ],
            sortOrder: [
              function (val) {
                var legalValues = [
                  'ascending',
                  'descending'
                ];
                if (legalValues.indexOf(val) === -1) {
                  throw new MalformedRequestError('Users cannot be sorted in ' + val + ' order.');
                }
              }
            ],
            offset: ['natural']
          }).then(function () {

            // Create a query for a search.
            var query = trx
              .from('users')
              .select(readableAttributes)
              .limit(20);

            if (args.query) {
              // Add sorting.
              if (args.query && args.query.sortBy) {
                var sortBy = args.query.sortBy;
                var sortOrder = 'asc';
                if (args.query.sortOrder === 'descending') {
                  sortOrder = 'desc';
                }
                query = query.orderBy(sortBy, sortOrder);
              }

              // Add offset.
              if (args.query && args.query.offset !== undefined) {
                query = query.offset(args.query.offset);
              }

              // Add search parameters.
              // Some of the parameters need special treatment.
              if (args.query.givenName) {
                query = query.whereRaw('unaccent("givenName") ilike unaccent(?) || \'%\'', [escapeForLike(args.query.givenName)]);
              }
              if (args.query.familyName) {
                query = query.whereRaw('unaccent("familyName") ilike unaccent(?)', [escapeForLike(args.query.familyName) + '%']);
              }
              if (args.query.emailAddress) {
                query = query.where('emailAddress', 'ilike', escapeForLike(args.query.emailAddress) + '%');
              }
              // The remaining parameters can be used as they are.
              var remainingParameters = _.pick(args.query, [
                // There are no more parameters yet.
              ]) || {};
              query = query.where(remainingParameters);
            }

            // The query is finished. Return it.
            return query;
          });
        }
      }).then(function (result) {
        return JSON.parse(JSON.stringify(result));
      });
    },

    update: function (args) {
      return authenticatedTransaction(knex, args.auth, function (trx, authUser) {
        // normal, authenticated user update
        if (authUser) {
          return authenticatedUpdate(authUser, trx, args.params.userId, args.body);

        // setting password using a password reset key
        } else if (args.body.password) {
          return anonymousPasswordUpdate(trx, args.params.userId, args.body);

          // generating a new password reset key
        } else if (args.body.passwordResetKey === null) {
          return anonymousPasswordResetKeyUpdate(emailer, trx, args.body);

        // Those are the only options. Otherwise, throw.
        } else {
          throw new AuthenticationError();
        }
      }).then(function (user) {
        if (user instanceof Object) {
          return JSON.parse(JSON.stringify(user));
        }
      });
    }
  };
};
