'use strict'
const _ = require('lodash')
const isComplete = require('./isComplete')

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

function transformOutput (users, authUser, when) {
  const incompleteOmitted = _.filter(users, user => {
    const authorisedToViewIncomplete = !!authUser && (!!authUser.admin || authUser.id === user.id)
    return authorisedToViewIncomplete || isComplete(user, when)
  })
  return _.map(incompleteOmitted, user => {
    let readableAttributes = publicReadableAttributes
    if (authUser) {
      if (authUser.admin) {
        readableAttributes = adminReadableAttributes
      } else if (authUser.id === user.id) {
        readableAttributes = selfReadableAttributes
      }
    }
    return _.pick(user, readableAttributes)
  })
}

module.exports = transformOutput
