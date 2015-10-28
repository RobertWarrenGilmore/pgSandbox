var authenticatedTransaction = require('./authenticatedTransaction');
var AuthenticationError = require('../errors/authenticationError');
var Promise = require('bluebird');

module.exports = function (knex) {

  return {
    read: function (args) {
      return authenticatedTransaction(knex, args.auth, function (trx, authUser) {
        if (!authUser) {
          return Promise.reject(new AuthenticationError());
        } else {
          return Promise.resolve();
        }
      });
    }
  };
};
