'use strict'
const authenticatedTransaction = require('../utilities/authenticatedTransaction')
const escapeForLike = require('../utilities/escapeForLike')
const crypto = require('./crypto')
const sendPasswordResetEmail = require('./sendPasswordResetEmail')
const AuthenticationError = require('../../../errors/authenticationError')
const MalformedRequestError = require('../../../errors/malformedRequestError')
const NoSuchResourceError = require('../../../errors/noSuchResourceError')
const validate = require('../../../utilities/validate')
const { funcs: vf } = validate

module.exports = (knex, emailer) => args =>
  authenticatedTransaction(knex, args.auth, (trx, authUser) =>

    validate(args.body, {
      emailAddress: [
        vf.notUndefined('You must provide an email address to perform a password update or to reset the password.'),
        vf.notNull('You must provide an email address to perform a password update or to reset the password.'),
        vf.emailAddress('The email address must be an email address.')
      ],
      password: [
        vf.string('The password must be a string.'),
        vf.minLength('The password must not be shorter than eight characters.', 8),
        vf.maxLength('The password must not be longer than thirty characters.', 30)
      ],
      passwordResetKey: [
        vf.notUndefined('You must provide a password reset key to perform a password update or null to reset the password.'),
        vf.string('The password reset key must be a string.'),
        vf.matchesRegex('The password reset key must be thirty alphanumeric characters.', /^[A-Za-z0-9]{30}$/)
      ]
    })
    .then(() =>

      // Get the existing user.
      trx
        .from('users')
        .where('emailAddress', 'ilike', escapeForLike(args.body.emailAddress))
        .select(['emailAddress', 'id', 'passwordResetKeyHash'])
    )
    .then(users => {
      if (!users.length) {
        throw new NoSuchResourceError()
      }
      const oldUser = users[0]

      const {
        emailAddress,
        password,
        passwordResetKey
      } = args.body

      // generating a new password reset key
      if (passwordResetKey === null) {
        // Generate a key.
        const key = crypto.generatePasswordResetKey()
        // Set the key hash.
        return trx
          .from('users')
          .where('id', oldUser.id)
          .update({
            passwordResetKeyHash: key.hash
          })
          .then(() =>
            sendPasswordResetEmail(emailer, emailAddress, key.key)
          )
          // Send the password reset email. Note that the transaction can still fail at this point.

      // setting password using a password reset key
      } else if (password) {
        // Verify the provided password reset key against the hash in the existing user.
        if (
          !passwordResetKey ||
          !oldUser.passwordResetKeyHash ||
          !crypto.verifyPasswordResetKey(passwordResetKey, oldUser.passwordResetKeyHash)
        )
          throw new AuthenticationError()
        // Do the update.
        return trx
          .from('users')
          .where('id', oldUser.id)
          .update({
            passwordHash: crypto.hashPassword(password),
            passwordResetKeyHash: null
          })

      // Those are the only options. Otherwise, throw.
      } else {
        throw new MalformedRequestError()
      }

    })
    .then(() => null)
  )
