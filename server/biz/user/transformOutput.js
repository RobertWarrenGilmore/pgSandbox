var _ = require('lodash');

var publicReadableAttributes = [
  'id',
  'givenName',
  'familyName',
  'active',
  'authorisedToBlog'
];
var selfReadableAttributes = [
  'id',
  'givenName',
  'familyName',
  'active',
  'authorisedToBlog',
  'emailAddress'
];
var adminReadableAttributes = [
  'id',
  'givenName',
  'familyName',
  'active',
  'authorisedToBlog',
  'emailAddress',
  'admin'
];

function transformOutput (users, authUser) {
  return _.map(users, function (user) {
    var readableAttributes = publicReadableAttributes;
    if (authUser) {
      if (authUser.admin) {
        readableAttributes = adminReadableAttributes;
      } else if (authUser.id === user.id) {
        readableAttributes = selfReadableAttributes;
      }
    }
    return _.pick(user, readableAttributes);
  });
}

module.exports = transformOutput;
