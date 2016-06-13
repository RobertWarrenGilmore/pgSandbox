'use strict'
const _ = require('lodash')
const authenticatedTransaction = require('../utilities/authenticatedTransaction')
const validate = require('../../../utilities/validate')
const vf = validate.funcs
const ValidationError = validate.ValidationError
const escapeForLike = require('../utilities/escapeForLike')
const outputQuery = require('./outputQuery')
const MalformedRequestError = require('../../errors/malformedRequestError')
const NoSuchResourceError = require('../../errors/noSuchResourceError')

module.exports = knex =>
  args =>
    authenticatedTransaction(knex, args.auth, (trx, authUser) => {

      if (args.params && Object.keys(args.params).length && args.query && Object.keys(args.query).length) {
        throw new MalformedRequestError('A read against a specific user cannot filter by any other parameters.')
      }
      if (args.params && args.params.userId) {
        // Read a specific user.
        return fetchUserById(authUser, trx, args.params.userId)
      } else {
        // Query a list of users.
        return searchUsers(authUser, trx, args.query)
      }
    })
    .then(result => JSON.parse(JSON.stringify(result)))

const fetchUserById = (authUser, trx, userId) =>
  outputQuery(authUser, trx, qb => {
    qb.where('id', userId)
  })
  .then(users => {
    if (!users.length) {
      throw new NoSuchResourceError()
    }
    return users[0]
  })

const searchUsers = (authUser, trx, queryParameters) =>
  validate(queryParameters || {}, {
    emailAddress: [
      val => {
        if (val !== undefined
          && val !== null
          && (!authUser || !authUser.admin)) {
          throw new ValidationError('You are not authorised to search by email address.')
        }
      }
    ],
    givenName: [],
    familyName: [],
    authorisedToBlog: [
      vf.boolean('The blog authorisation parameter must be a boolean.')
    ],
    sortBy: [
      val => {
        if (val === undefined || val === null) {
          return
        }
        const legalValues = [
          'emailAddress',
          'givenName',
          'familyName'
        ]
        if (legalValues.indexOf(val) === -1) {
          throw new ValidationError('Users cannot be sorted by ' + val + '.')
        }
        const adminOnlyValues = [
          'emailAddress'
        ]
        if ((!authUser || !authUser.admin) && adminOnlyValues.indexOf(val) !== -1) {
          throw new ValidationError('You are not authorised to sort by ' + val + '.')
        }
      }
    ],
    sortOrder: [
      val => {
        const legalValues = [
          'ascending',
          'descending'
        ]
        if (val !== undefined
          && val !== null
          && legalValues.indexOf(val) === -1) {
          throw new ValidationError('Users cannot be sorted in ' + val + ' order.')
        }
      }
    ],
    offset: [
      vf.naturalNumber('The offset must be a natural number.')
    ]
  })
  // Create a query for a search.
  .then(() => outputQuery(authUser, trx, qb => {
    qb.limit(20)
    if (queryParameters) {
      // Add sorting.
      if (queryParameters.sortBy) {
        const sortBy = queryParameters.sortBy
        const sortOrder =
        (queryParameters.sortOrder === 'descending') ?
        'desc' :
        'asc'
        qb.orderBy(sortBy, sortOrder)
      }

      // Add offset.
      if (queryParameters.offset !== undefined) {
        qb.offset(queryParameters.offset)
      }

      // Add search parameters.
      // Some of the parameters need special treatment.
      if (queryParameters.givenName) {
        qb.whereRaw('unaccent("givenName") ilike unaccent(?) || \'%\'', [escapeForLike(queryParameters.givenName)])
      }
      if (queryParameters.familyName) {
        qb.whereRaw('unaccent("familyName") ilike unaccent(?)', [escapeForLike(queryParameters.familyName) + '%'])
      }
      if (queryParameters.emailAddress) {
        qb.where('emailAddress', 'ilike', escapeForLike(queryParameters.emailAddress) + '%')
      }
      // The remaining parameters can be used as they are.
      const remainingParameters = _.pick(queryParameters, [
        'authorisedToBlog'
      ]) || {}
      qb.where(remainingParameters)
    }
  }))
