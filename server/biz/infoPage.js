var authenticatedTransaction = require('./utilities/authenticatedTransaction');
var AuthorisationError = require('../errors/authorisationError');
var NoSuchResourceError = require('../errors/noSuchResourceError');

module.exports = function (knex) {

  return {

    read: function (args) {
      return authenticatedTransaction(knex, args.auth, function (trx, authUser) {
        return trx
          .from('infoPages')
          .where('id', args.params.pageId)
          .select(['text', 'active'])
          .then(function (pages) {
            if (!pages.length) {
              throw new NoSuchResourceError();
            }
            var page = pages[0];
            if (!page.active) {
              throw new AuthorisationError();
            }
            return page.text;
          });
      }).then(function (result) {
        return JSON.parse(JSON.stringify(result));
      });
    }


  };
};
