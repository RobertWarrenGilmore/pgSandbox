'use strict'
const authenticatedTransaction = require('../utilities/authenticatedTransaction')
const escapeForLike = require('../utilities/escapeForLike')
const crypto = require('./crypto')
const outputQuery = require('./outputQuery')
const sendPasswordResetEmail = require('./sendPasswordResetEmail')
const AuthenticationError = require('../../errors/authenticationError')
const AuthorisationError = require('../../errors/authorisationError')
const NoSuchResourceError = require('../../errors/noSuchResourceError')
const validate = require('../../../utilities/validate')
const { funcs: vf, ValidationError } = validate
const filesUtil = require('../utilities/files')
const dataUrlParts = filesUtil.dataUrlParts
const Jimp = require('jimp')

module.exports = (knex, emailer) =>
  args =>
    validate(args.params || {}, {
      userId: [
        vf.naturalNumber('The user ID must be a natural number.')
      ]
    })
    .then(() =>
      authenticatedTransaction(knex, args.auth, (trx, authUser) => {
        // normal, authenticated user update
        if (authUser) {
          return authenticatedUpdate(authUser, trx, args.params.userId, args.body)

        // setting password using a password reset key
        } else if (args.body.password) {
          return anonymousPasswordUpdate(trx, args.params.userId, args.body)

        // generating a new password reset key
        } else if (args.body.passwordResetKey === null) {
          return anonymousPasswordResetKeyUpdate(emailer, trx, args.body)

        // Those are the only options. Otherwise, throw.
        } else {
          throw new AuthenticationError()
        }
      })
      .then(user => {
        if (user instanceof Object) {
          return JSON.parse(JSON.stringify(user))
        }
      })
    )

function authenticatedUpdate(authUser, trx, id, newUser) {
  // Reject unauthorised updates.
  if (authUser.id != id && !authUser.admin) {
    throw new AuthorisationError()
  }

  // Get the existing user.
  return trx
    .from('users')
    .where('id', id)
    .select()
    .then(users => {
      if (!users.length) {
        throw new NoSuchResourceError()
      }
      const oldUser = users[0]
      return validate(newUser, {
        emailAddress: [
          vf.notNull('The email address cannot be removed.'),
          vf.emailAddress('The email address must be, well, an email address.'),
          // Check for case-insensitive uniqueness of email address.
          val =>
            val === undefined ||
            val === null ||
              trx
                .from('users')
                .select(['id', 'emailAddress'])
                .where('emailAddress', 'ilike', escapeForLike(val))
                .then(existingUsers => {
                  if (existingUsers && existingUsers.length && existingUsers[0].id != id) {
                    throw new ValidationError('That email address is already in use by another user.')
                  }
                })
        ],
        password: [
          vf.notNull('The password cannot be removed.'),
          vf.string('The password must be a string.'),
          vf.minLength('The password must not be shorter than eight characters.', 8),
          vf.maxLength('The password must not be longer than thirty characters.', 30)
        ],
        givenName: [
          vf.notEmpty('The first name cannot be removed.'),
          vf.notNull('The first name cannot be removed.'),
          vf.string('The first name must be a string.'),
          vf.maxLength('The first name must not be longer than thirty characters.', 30)
        ],
        familyName: [
          vf.notEmpty('The last name cannot be removed.'),
          vf.notNull('The last name cannot be removed.'),
          vf.string('The last name must be a string.'),
          vf.maxLength('The last name must not be longer than thirty characters.', 30)
        ],
        active: [
          vf.notNull('The user must be set either active or inactive.'),
          vf.boolean('The user must be set either active or inacvite.')
        ],
        authorisedToBlog: [
          val => {
            if (authUser.admin) {
              vf.notNull('The user must be set either able or unable to blog.')
              vf.boolean('The user must be set either able or unable to blog.')
            } else if (val !== undefined) {
              throw new ValidationError('You are not authorised to change a user\'s blog privileges.')
            }
          }
        ],
        admin: [
          val => {
            if (authUser.admin) {
              vf.notNull('The user must be set either admin or not.')
              vf.boolean('The user must be set either admin or not.')
            } else if (val !== undefined) {
              throw new ValidationError('You are not authorised to change a user\'s admin privileges.')
            }
          }
        ],
        avatar: [
          val => {
            vf.file('The avatar must be a PNG, JPEG, or BMP file no larger than 200 kB.', {
              types: [
                'image/png',
                'image/jpeg',
                'image/bmp'
              ],
              maxSize: 204800
            })(val)
            if (val) {
              // Here we'll do some validations and mutate the avatar.
              let originalBuffer
              try {
                originalBuffer = Buffer.from(dataUrlParts(val).data, 'base64')
              } catch (e) {
                throw new ValidationError('The icon must be a valid PNG, JPEG, or BMP image.')
              }
              return Jimp.read(originalBuffer)
                .then(image =>
                  new Promise((resolve, reject) => {
                    image
                      .cover(200, 200)
                      .quality(60)
                      .getBuffer(Jimp.MIME_JPEG, (err, buffer) => {
                        if (err)
                          reject(err)
                        else
                          resolve(buffer)
                      })
                  })
                )
                .then(buffer => {
                  newUser.avatar = '\\x' + buffer.toString('hex')
                })
                .catch(err => {
                  if (err instanceof ValidationError)
                    throw err
                  else
                    throw new ValidationError('The avatar must be a valid PNG, JPEG, or BMP image.')
                })
            }
          }
        ]
      })
      .then(() => oldUser)
    })
    .then(oldUser => {

      // Handle the password specially, by hashing it.
      if (newUser.password) {
        newUser.passwordHash = crypto.hashPassword(newUser.password)
        newUser.passwordResetKeyHash = null
      }
      delete newUser.password

      // Do the update.
      return trx
        .from('users')
        .where('id', id)
        .update(newUser)
    })
    .then(() =>

      // Return the changed user.
      outputQuery(authUser, trx, qb => {
        qb.where('id', id)
      })
      .then(users => {
        if (!users.length) {
          throw new NoSuchResourceError()
        }
        return users[0]
      })
    )
}

function anonymousPasswordUpdate(trx, id, newUser) {

  // Get the existing user.
  return trx
    .from('users')
    .where('id', id)
    .select()
    .then(users => {
      if (!users.length) {
        throw new NoSuchResourceError()
      }
      const oldUser = users[0]

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
      })
      .then(() => oldUser)
    })
    .then(oldUser => {

      // Verify the provided password reset key against the hash in the existing user.
      if (!newUser.passwordResetKey || !oldUser.passwordResetKeyHash || !crypto.verifyPasswordResetKey(newUser.passwordResetKey, oldUser.passwordResetKeyHash)) {
        throw new AuthenticationError()
      }

      // Do the update.
      return trx
        .from('users')
        .where('id', id)
        .update({
          passwordHash: crypto.hashPassword(newUser.password),
          passwordResetKeyHash: null
        })
    })
}

function anonymousPasswordResetKeyUpdate(emailer, trx, body) {

  // Generate a key.
  const key = crypto.generatePasswordResetKey()

  // Get the existing user.
  return trx
    .from('users')
    .where('emailAddress', 'ilike', escapeForLike(body.emailAddress))
    .select()
    .then(users => {
      if (!users.length) {
        throw new NoSuchResourceError()
      }
      const oldUser = users[0]

      return validate(body, {
        passwordResetKey: [
          vf.notUndefined('You must set the password reset key to null to perform a password reset.'),
          vf.null('You must set the password reset key to null to perform a password reset.')
        ],
        emailAddress: [
          vf.notUndefined('You must provide a user\'s email address to perform a password reset.'),
          vf.emailAddress('The email address must be, well, an email address.')
        ]
      })
      .then(() => oldUser)
    })
    .then(() =>

      // Set the key hash.
      trx
        .from('users')
        .where('emailAddress', 'ilike', escapeForLike(body.emailAddress))
        .update({
          passwordResetKeyHash: key.hash
        }).returning(['id', 'emailAddress']).then(function (rows) {
          if (rows.length === 0) {
            throw new NoSuchResourceError()
          }
          return {
            id: rows[0].id,
            key: key.key
          }
        })

    )
    // Send the password reset email. Note that the transaction can still fail at this point.
    .tap(result =>
      sendPasswordResetEmail(emailer, body.emailAddress, result.id, result.key)
    )
}
