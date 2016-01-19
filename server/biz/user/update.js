var _ = require('lodash');
var authenticatedTransaction = require('../utilities/authenticatedTransaction');
var validate = require('../utilities/validate');
var escapeForLike = require('../utilities/escapeForLike');
var crypto = require('./crypto');
var transformOutput = require('./transformOutput');
var sendPasswordResetEmail = require('./sendPasswordResetEmail');
var AuthenticationError = require('../../errors/authenticationError');
var AuthorisationError = require('../../errors/authorisationError');
var NoSuchResourceError = require('../../errors/noSuchResourceError');
var ConflictingEditError = require('../../errors/conflictingEditError');

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
    });
  };
};

function authenticatedUpdate(authUser, trx, id, body) {
  // Reject unauthorised updates.
  if (authUser.id != id && !authUser.admin) {
    throw new AuthorisationError();
  }

  var validationRules = {
    emailAddress: [
      'email',
      // Check for case-insensitive uniqueness of email address.
      function (val) {
        return trx
          .from('users')
          .select(['id', 'emailAddress'])
          .where('emailAddress', 'ilike', escapeForLike(val))
          .then(function (existingUsers) {
            if (existingUsers && existingUsers.length && existingUsers[0].id != id) {
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
  };
  if (authUser.admin) {
    _.merge(validationRules, {
      authorisedToBlog: ['boolean'],
      admin: ['boolean']
    });
  }

  return validate(body, validationRules).then(function() {
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
    return transformOutput(rows, authUser)[0];
  });
}

function anonymousPasswordUpdate(trx, id, newUser) {

  // Reject attributes other than passwordResetKey and password.
  return validate(newUser, {
    password: [
      'required',
      'minLength:8',
      'maxLength:30'
    ],
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
  }).then(function (rows) {
    return transformOutput(rows)[0];
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
    var key = crypto.generatePasswordResetKey();

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
  }).then(function (rows) {
    return transformOutput(rows)[0];
  });
}
