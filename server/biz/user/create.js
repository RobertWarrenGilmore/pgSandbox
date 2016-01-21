var _ = require('lodash');
var authenticatedTransaction = require('../utilities/authenticatedTransaction');
var validate = require('../../../utilities/validate');
var vf = validate.funcs;
var ValidationError = validate.ValidationError;
var escapeForLike = require('../utilities/escapeForLike');
var crypto = require('./crypto');
var sendPasswordResetEmail = require('./sendPasswordResetEmail');
var ConflictingEditError = require('../../errors/conflictingEditError');
var MalformedRequestError = require('../../errors/malformedRequestError');

module.exports = function (knex, emailer) {
  return function create (args) {
    return authenticatedTransaction(knex, args.auth, function (trx, authUser) {
      return validate(args.body, {
        emailAddress: [
          vf.notUndefined('The email address is required.'),
          vf.notNull('The email address is required.'),
          vf.emailAddress('The email address must be, well, an email address.'),
          // Check for case-insensitive uniqueness of email address.
          function (val) {
            return val === undefined
              || trx
                .from('users')
                .select(['id', 'emailAddress'])
                .where('emailAddress', 'ilike', escapeForLike(val))
                .then(function (existingUsers) {
                  if (existingUsers && existingUsers.length) {
                    throw new ConflictingEditError('That email address is already in use by another user.');
                  }
                });
          }
        ]
      }).then(function () {

        // Set the password reset key.
        var key = crypto.generatePasswordResetKey();

        // Do the insertion.
        var newUser = {};
        _.merge(newUser, args.body);
        _.merge(newUser, {
          passwordResetKeyHash: key.hash
        });
        return trx
          .into('users')
          .insert(newUser, 'id')
          .then(function (rows) {
            return {
              id: rows[0].id,
              key: key.key
            };
          });

      // Send the password reset email. Note that the transaction can still fail at this point.
      }).tap(function (result) {
        return sendPasswordResetEmail(emailer, args.body.emailAddress, result.id, result.key);

      }).then(function (result) {
        return trx
          .from('users')
          .where('id', result.id)
          .select();
      }).then(function () {
        return null;
      }).catch(ValidationError, function (err) {
        throw new MalformedRequestError(err.message);
      });
    });
  };
};
