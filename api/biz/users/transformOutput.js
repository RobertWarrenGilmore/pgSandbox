'use strict'
var _ = require('lodash')
var isComplete = require('./isComplete')

var publicReadableAttributes = [
  'id',
  'givenName',
  'familyName',
  'active',
  'authorisedToBlog'
]
var selfReadableAttributes = [
  'id',
  'givenName',
  'familyName',
  'active',
  'authorisedToBlog',
  'emailAddress'
]
var adminReadableAttributes = [
  'id',
  'givenName',
  'familyName',
  'active',
  'authorisedToBlog',
  'emailAddress',
  'admin'
]

function transformOutput (users, authUser, when) {
  var incompleteOmitted = _.filter(users, function (user) {
    var authorisedToViewIncomplete = !!authUser && (!!authUser.admin || authUser.id === user.id)
    return authorisedToViewIncomplete || isComplete(user, when)
  })
  return _.map(incompleteOmitted, function (user) {
    var readableAttributes = publicReadableAttributes
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
