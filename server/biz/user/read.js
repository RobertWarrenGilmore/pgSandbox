var _ = require('lodash');
var authenticatedTransaction = require('../utilities/authenticatedTransaction');
var validate = require('../utilities/validate');
var escapeForLike = require('../utilities/escapeForLike');
var transformOutput = require('./transformOutput');
var MalformedRequestError = require('../../errors/malformedRequestError');
var AuthorisationError = require('../../errors/authorisationError');
var NoSuchResourceError = require('../../errors/noSuchResourceError');

module.exports = function (knex) {
  return function read (args) {
    return authenticatedTransaction(knex, args.auth, function (trx, authUser) {

      if (args.params && Object.keys(args.params).length && args.query && Object.keys(args.query).length) {
        throw new MalformedRequestError('A read against a specific user cannot filter by any other parameters.');
      }

      if (args.params && args.params.userId) {
        // Read a specific user.
        return fetchUserById(args.params.userId, authUser, trx);
      } else {
        // Query a list of users.
        return searchUsers(args.query, authUser, trx);
      }
    }).then(function (result) {
      return JSON.parse(JSON.stringify(result));
    });
  };
};

function fetchUserById (userId, authUser, trx) {
  return trx
    .from('users')
    .where('id', userId)
    .select().then(function (users) {
      if (!users.length) {
        throw new NoSuchResourceError();
      }
      return transformOutput(users, authUser)[0];
    });
}

function searchUsers (queryParameters, authUser, trx) {
  return validate(_.clone(queryParameters) || {}, {
    emailAddress: [
      function (val) {
        if ((!authUser || !authUser.admin) /*&& val !== null*/) {
          throw new AuthorisationError('You are not authorised to search by email address.');
        }
      }
    ],
    givenName: [],
    familyName: [],
    authorisedToBlog: ['boolean'],
    sortBy: [
      function (val) {
        var legalValues = [
          'emailAddress',
          'givenName',
          'familyName'
        ];
        if (legalValues.indexOf(val) === -1) {
          throw new MalformedRequestError('Users cannot be sorted by ' + val + '.');
        }
        var adminOnlyValues = [
          'emailAddress'
        ];
        if ((!authUser || !authUser.admin) && adminOnlyValues.indexOf(val) !== -1) {
          throw new AuthorisationError('You are not authorised to sort by ' + val + '.');
        }
      }
    ],
    sortOrder: [
      function (val) {
        var legalValues = [
          'ascending',
          'descending'
        ];
        if (legalValues.indexOf(val) === -1) {
          throw new MalformedRequestError('Users cannot be sorted in ' + val + ' order.');
        }
      }
    ],
    offset: ['natural']
  }).then(function () {

    // Create a query for a search.
    var query = trx
      .from('users')
      .select()
      .limit(20);

    if (queryParameters) {
      // Add sorting.
      if (queryParameters && queryParameters.sortBy) {
        var sortBy = queryParameters.sortBy;
        var sortOrder = 'asc';
        if (queryParameters.sortOrder === 'descending') {
          sortOrder = 'desc';
        }
        query = query.orderBy(sortBy, sortOrder);
      }

      // Add offset.
      if (queryParameters && queryParameters.offset !== undefined) {
        query = query.offset(queryParameters.offset);
      }

      // Add search parameters.
      // Some of the parameters need special treatment.
      if (queryParameters.givenName) {
        query = query.whereRaw('unaccent("givenName") ilike unaccent(?) || \'%\'', [escapeForLike(queryParameters.givenName)]);
      }
      if (queryParameters.familyName) {
        query = query.whereRaw('unaccent("familyName") ilike unaccent(?)', [escapeForLike(queryParameters.familyName) + '%']);
      }
      if (queryParameters.emailAddress) {
        query = query.where('emailAddress', 'ilike', escapeForLike(queryParameters.emailAddress) + '%');
      }
      // The remaining parameters can be used as they are.
      var remainingParameters = _.pick(queryParameters, [
        'authorisedToBlog'
      ]) || {};
      query = query.where(remainingParameters);
    }

    query = query.then(function (users) {
      return transformOutput(users, authUser);
    });

    // The query is finished. Return it.
    return query;
  });
}
