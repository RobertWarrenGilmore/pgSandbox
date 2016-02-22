'use strict'
const authenticatedTransaction = require('./utilities/authenticatedTransaction')
const AuthenticationError = require('../errors/authenticationError')
const Promise = require('bluebird')

module.exports = knex => ({

  read: args =>
    authenticatedTransaction(knex, args.auth, (trx, authUser) => {
      if (!authUser) {
        return Promise.reject(new AuthenticationError())
      } else {
        return Promise.resolve({
          id: authUser.id
        })
      }
    })

})
