'use strict'
const Promise = require('bluebird')
const AuthenticationError = require('../../../errors/authenticationError')
const bcrypt = Promise.promisifyAll(require('bcrypt'))
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
          return users[0]
        })
        .tap(authUser =>
          bcrypt.compareAsync(auth.password, authUser.passwordHash)
            .then(passwordGood => {
              if (!passwordGood) {
                throw new AuthenticationError('The password was incorrect.')
              }
            })
        )
    } else {
      authPromise = Promise.resolve(null)
    }

    return authPromise.then(authUser => callback(trx, authUser))

  })
}

module.exports = authenticatedTransaction
