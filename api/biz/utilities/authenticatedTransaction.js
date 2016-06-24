'use strict'
const AuthenticationError = require('../../../errors/authenticationError')
const bcrypt = require('bcrypt')
const escapeForLike = require('./escapeForLike')

function authenticatedTransaction (knex, auth, callback) {

  return knex.transaction(trx => {

    let authPromise
    if (auth && auth.emailAddress && auth.password) {
      authPromise = trx
        .from('users')
        .select()
        .where('emailAddress', 'ilike', escapeForLike(auth.emailAddress))
        .then(users => {
          if (users.length === 0) {
            throw new AuthenticationError('There is no such user.')
          }
          const passwordGood = bcrypt.compareSync(auth.password, users[0].passwordHash)
          if (!passwordGood)
            throw new AuthenticationError('The password was incorrect.')
          return users[0]
        })
    } else {
      authPromise = Promise.resolve(null)
    }

    return authPromise.then(authUser => callback(trx, authUser))

  })
}

module.exports = authenticatedTransaction
