'use strict'
function isComplete(user, when) {
  // We will need "when" in a later version. This time stamp can be used to check whether the user will be complete at a given date, like if there is an expiration date. This can stop us committing a user to an action if he won't be complete on the date of the action.
  var hasName = !!user.givenName && !!user.familyName
  var result = hasName
  return result
}

module.exports = isComplete
