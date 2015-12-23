var Promise = require('bluebird');
var AuthenticationError = require('../../errors/authenticationError');
var bcrypt = Promise.promisifyAll(require('bcrypt'));
var escapeForLike = require('./escapeForLike');

function authenticatedTransaction(knex, auth, callback) {

  return knex.transaction(function (trx) {

    var authPromise;
    if (auth && auth.emailAddress && auth.password) {
      authPromise = trx
        .from('users')
        .select()
        .where('emailAddress', 'ilike', escapeForLike(auth.emailAddress))
        .then(function (users) {
          if (users.length === 0) {
            throw new AuthenticationError('There is no such user.');
          }
          return users[0];
        }).tap(function (authUser) {
          return bcrypt.compareAsync(auth.password, authUser.passwordHash)
            .then(function (passwordGood) {
              if (!passwordGood) {
                throw new AuthenticationError('The password was incorrect.');
              }
            });
        });
    } else {
      authPromise = Promise.resolve(null);
    }

    return authPromise.then(function (authUser) {
      return callback(trx, authUser);
    });

  });
}

module.exports = authenticatedTransaction;
