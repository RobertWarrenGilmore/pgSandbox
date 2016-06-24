'use strict'
const moment = require('moment-timezone')
const authenticatedTransaction = require('../utilities/authenticatedTransaction')
const escapeForLike = require('../utilities/escapeForLike')
const crypto = require('./crypto')
const outputQuery = require('./outputQuery')
const AuthenticationError = require('../../../errors/authenticationError')
const AuthorisationError = require('../../../errors/authorisationError')
const NoSuchResourceError = require('../../../errors/noSuchResourceError')
const validate = require('../../../utilities/validate')
const { funcs: vf, ValidationError } = validate
const filesUtil = require('../utilities/files')
const dataUrlParts = filesUtil.dataUrlParts
const Jimp = require('jimp')

module.exports = (knex, emailer) => args =>
  authenticatedTransaction(knex, args.auth, (trx, authUser) => {
    if (!authUser)
      throw new AuthenticationError()

    const {
      params: {
        userId: id
      },
      body: newUser
    } = args

    if (authUser.id != id && !authUser.admin)
      throw new AuthorisationError()

    return validate(args.params || {}, {
      userId: [
        vf.naturalNumber('The user ID must be a natural number.')
      ]
    })
    .then(() =>

      // Get the existing user.
      trx
        .from('users')
        .where('id', id)
        .select()
        .then(users => {
          if (!users.length)
            throw new NoSuchResourceError()
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
            ],
            timeZone: [
              val => {
                if (val !== undefined) {
                  vf.notNull('The time zone is required.')(val)
                  if (moment.tz.zone(val) === null)
                    throw new ValidationError('The time zone was invalid.')
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
    )
  })
