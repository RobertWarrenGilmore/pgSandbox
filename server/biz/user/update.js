var authenticatedTransaction = require('../utilities/authenticatedTransaction');
var escapeForLike = require('../utilities/escapeForLike');
var crypto = require('./crypto');
var transformOutput = require('./transformOutput');
var sendPasswordResetEmail = require('./sendPasswordResetEmail');
var AuthenticationError = require('../../errors/authenticationError');
var AuthorisationError = require('../../errors/authorisationError');
var NoSuchResourceError = require('../../errors/noSuchResourceError');
var MalformedRequestError = require('../../errors/malformedRequestError');
var ConflictingEditError = require('../../errors/conflictingEditError');
var validate = require('../utilities/validate');
var vf = validate.funcs;
var ValidationError = validate.ValidationError;

module.exports = function (knex, emailer) {
  return function update (args) {
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
    }).catch(ValidationError, function (err) {
      throw new MalformedRequestError(err.message);
    });
  };
};

function authenticatedUpdate(authUser, trx, id, newUser) {
  // Reject unauthorised updates.
  if (authUser.id != id && !authUser.admin) {
    throw new AuthorisationError();
  }

  // Get the existing user.
  return trx
    .from('users')
    .where('id', id)
    .select()
    .then(function (users) {
      if (!users.length) {
        throw new NoSuchResourceError();
      }
      var oldUser = users[0];
      return validate(newUser, {
        emailAddress: [
          vf.notNull('The email address cannot be removed.'),
          vf.emailAddress('The email address must be, well, an email address.'),
          // Check for case-insensitive uniqueness of email address.
          function (val) {
            return val === undefined
              || trx
                .from('users')
                .select(['id', 'emailAddress'])
                .where('emailAddress', 'ilike', escapeForLike(val))
                .then(function (existingUsers) {
                  if (existingUsers && existingUsers.length && existingUsers[0].id != id) {
                    throw new ValidationError('That email address is already in use by another user.');
                  }
                });
          }
        ],
        password: [
          vf.notNull('The password cannot be removed.'),
          vf.string('The password must be a string.'),
          vf.minLength('The password must not be shorter than eight characters.', 8),
          vf.maxLength('The password must not be longer than thirty characters.', 30)
        ],
        givenName: [
          function (val) {
            if (oldUser.givenName) {
              vf.notNull('The first name cannot be removed.')(val);
              vf.notEmpty('The first name cannot be removed.')(val);
            }
          },
          vf.string('The first name must be a string.'),
          vf.maxLength('The first name must not be longer than thirty characters.', 30)
        ],
        familyName: [
          function (val) {
            if (oldUser.familyName) {
              vf.notNull('The last name cannot be removed.')(val);
              vf.notEmpty('The last name cannot be removed.')(val);
            }
          },
          vf.string('The last name must be a string.'),
          vf.maxLength('The last name must not be longer than thirty characters.', 30)
        ],
        active: [
          vf.notNull('The user must be set either active or inactive.'),
          vf.boolean('The user must be set either active or inacvite.')
        ],
        authorisedToBlog: [
          function (val) {
            if (authUser.admin) {
              vf.notNull('The user must be set either able or unable to blog.');
              vf.boolean('The user must be set either able or unable to blog.');
            } else if (val !== undefined) {
              throw new ValidationError('You are not authorised to change a user\'s blog privileges.');
            }
          }
        ],
        admin: [
          function (val) {
            if (authUser.admin) {
              vf.notNull('The user must be set either admin or not.');
              vf.boolean('The user must be set either admin or not.');
            } else if (val !== undefined) {
              throw new ValidationError('You are not authorised to change a user\'s admin privileges.');
            }
          }
        ]
      }).thenReturn(oldUser);
    }).then(function (oldUser) {

      // Handle the password specially, by hashing it.
      if (newUser.password) {
        newUser.passwordHash = crypto.hashPassword(newUser.password);
        newUser.passwordResetKeyHash = null;
      }
      delete newUser.password;

      // Do the update.
      return trx
        .from('users')
        .where('id', id)
        .update(newUser);
    }).then(function () {
      return trx
        .from('users')
        .where('id', id)
        .select();
    }).then(function (rows) {
      return transformOutput(rows, authUser, Date.now())[0];
    });
}

function anonymousPasswordUpdate(trx, id, newUser) {

  // Get the existing user.
  return trx
    .from('users')
    .where('id', id)
    .select()
    .then(function (users) {
      if (!users.length) {
        throw new NoSuchResourceError();
      }
      var oldUser = users[0];

      // Reject attributes other than passwordResetKey and password.
      return validate(newUser, {
        password: [
          vf.notUndefined('You must provide a password to perform a password update.'),
          vf.string('The password must be a string.'),
          vf.minLength('The password must not be shorter than eight characters.', 8),
          vf.maxLength('The password must not be longer than thirty characters.', 30)
        ],
        passwordResetKey: [
          vf.notUndefined('You must provide a password reset key to perform a password update.'),
          vf.string('The password reset key must be a string.'),
          vf.matchesRegex('The password reset key must be thirty alphanumeric characters.', /^[A-Za-z0-9]{30}$/)
        ]
      }).thenReturn(oldUser);
    }).then(function (oldUser) {

      // Verify the provided password reset key against the hash in the existing user.
      if (!newUser.passwordResetKey || !oldUser.passwordResetKeyHash || !crypto.verifyPasswordResetKey(newUser.passwordResetKey, oldUser.passwordResetKeyHash)) {
        throw new AuthenticationError();
      }

      // Do the update.
      return trx
        .from('users')
        .where('id', id)
        .update({
          passwordHash: crypto.hashPassword(newUser.password),
          passwordResetKeyHash: null
        });
    }).then(function () {
      return trx
        .from('users')
        .where('id', id)
        .select();
    }).then(function () {
      return null;
    });
}

function anonymousPasswordResetKeyUpdate(emailer, trx, body) {

  // Generate a key.
  var key = crypto.generatePasswordResetKey();

  // Get the existing user.
  return trx
    .from('users')
    .where('emailAddress', 'ilike', escapeForLike(body.emailAddress))
    .select()
    .then(function (users) {
      if (!users.length) {
        throw new NoSuchResourceError();
      }
      var oldUser = users[0];

      return validate(body, {
        passwordResetKey: [
          vf.notUndefined('You must set the password reset key to null to perform a password reset.'),
          vf.null('You must set the password reset key to null to perform a password reset.')
        ],
        emailAddress: [
          vf.notUndefined('You must provide a user\'s email address to perform a password reset.'),
          vf.emailAddress('The email address must be, well, an email address.')
        ]
      }).thenReturn(oldUser);
    }).then(function () {

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
            key: key.key
          };
        });

    // Send the password reset email. Note that the transaction can still fail at this point.
    }).tap(function (result) {
      return sendPasswordResetEmail(emailer, body.emailAddress, result.id, result.key);

    }).then(function (result) {
      return trx
        .from('users')
        .where('id', result.id)
        .select();
    }).then(function () {
      return null;
    });
}
