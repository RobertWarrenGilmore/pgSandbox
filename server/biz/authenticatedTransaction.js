var Promise = require('bluebird');
var AuthenticationError = require('../errors/authenticationError');
var bcrypt = Promise.promisifyAll(require('bcrypt'));

function verifyPassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

function authenticatedTransaction(knex, auth, callback) {

  return knex.transaction(function (trx) {

    var authPromise;
    if (auth && auth.emailAddress && auth.password) {
      authPromise = trx
        .from('users')
        .select()
        .where('emailAddress', auth.emailAddress)
        .then(function (users) {
          var authUser = users[0];
          if (authUser && verifyPassword(auth.password, authUser.passwordHash)) {
            return authUser;
          } else {
            throw new AuthenticationError();
          }
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
