'use strict'
const _ = require('lodash')
const moment = require('moment-timezone')
const authenticatedTransaction = require('../utilities/authenticatedTransaction')
const validate = require('../../../utilities/validate')
const { funcs: vf, ValidationError } = validate
const escapeForLike = require('../utilities/escapeForLike')
const crypto = require('./crypto')
const sendPasswordResetEmail = require('./sendPasswordResetEmail')
const ConflictingEditError = require('../../../errors/conflictingEditError')

module.exports = (knex, emailer) =>
  args =>
    authenticatedTransaction(knex, args.auth, (trx, authUser) =>
      validate(args.body, {
        emailAddress: [
          vf.notUndefined('The email address is required.'),
          vf.notNull('The email address is required.'),
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
                  if (existingUsers && existingUsers.length) {
                    throw new ConflictingEditError('That email address is already in use by another user.')
                  }
                })
        ],
        givenName: [
          vf.notEmpty('The first name is required.'),
          vf.notNull('The first name is required.'),
          vf.notUndefined('The first name is required.'),
          vf.string('The first name must be a string.'),
          vf.maxLength('The first name must not be longer than thirty characters.', 30)
        ],
        familyName: [
          vf.notEmpty('The last name is required.'),
          vf.notNull('The last name is required.'),
          vf.notUndefined('The last name is required.'),
          vf.string('The last name must be a string.'),
          vf.maxLength('The last name must not be longer than thirty characters.', 30)
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
      .then(() => {

        // Set the password reset key.
        const key = crypto.generatePasswordResetKey()

        // Do the insertion.
        let newUser = {}
        _.merge(newUser, args.body)
        _.merge(newUser, {
          passwordResetKeyHash: key.hash
        })
        return trx
          .into('users')
          .insert(newUser, 'id')
          .returning(['id'])
          .then(rows => ({
            id: rows[0].id,
            key: key.key
          }))
      })
      // Send the password reset email. Note that the transaction can still fail at this point.
      .tap(result =>
          sendPasswordResetEmail(emailer, args.body.emailAddress, result.key)
      )
      .then(result =>
          trx
            .from('users')
            .where('id', result.id)
            .select()
      )
      .then(() => null)
    )
