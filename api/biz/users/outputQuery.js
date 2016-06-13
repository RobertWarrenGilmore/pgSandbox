'use strict'
const _ = require('lodash')

const publicReadableAttributes = [
  'id',
  'givenName',
  'familyName',
  'active',
  'authorisedToBlog'
]
const selfReadableAttributes = [
  'id',
  'givenName',
  'familyName',
  'active',
  'authorisedToBlog',
  'emailAddress'
]
const adminReadableAttributes = [
  'id',
  'givenName',
  'familyName',
  'active',
  'authorisedToBlog',
  'emailAddress',
  'admin'
]

module.exports = (authUser, trx, queryModifier) => trx
  .from('users')
  .select()
  .modify(queryModifier)

  // Filter the users to restrict the visibility of inactive and incomplete users to admins and the user himself.
  .modify(qb => {
    if (!authUser || !authUser.admin) {
      qb.where(function () {
        if (authUser) {
          this.where('id', authUser.id)
        }
        qb.orWhere(function () {
          this
            .where('active', '=', true)
            .whereNotNull('givenName')
            .whereNotNull('familyName')
        })
      })
    }
  })

  .then(users => users.map(user => {
    let readableAttributes = publicReadableAttributes
    if (authUser) {
      if (authUser.admin) {
        readableAttributes = adminReadableAttributes
      } else if (authUser.id === user.id) {
        readableAttributes = selfReadableAttributes
      }
    }
    return _.pick(user, readableAttributes)
  }))
