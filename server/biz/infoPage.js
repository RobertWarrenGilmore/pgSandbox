var authenticatedTransaction = require('./utilities/authenticatedTransaction');
var AuthorisationError = require('../errors/authorisationError');
var NoSuchResourceError = require('../errors/noSuchResourceError');
var validate = require('./utilities/validate');

module.exports = function (knex) {

  return {

    read: function (args) {
      return authenticatedTransaction(knex, args.auth, function (trx, authUser) {
        return trx
          .from('infoPages')
          .where('id', args.params.pageId)
          .select(['title', 'body'])
          .then(function (pages) {
            if (!pages.length) {
              throw new NoSuchResourceError();
            }
            return pages[0];
          });
      });
    },

    update: function (args) {
      return authenticatedTransaction(knex, args.auth, function (trx, authUser) {
        if (!authUser || !authUser.admin) {
          throw new AuthorisationError('Only administrators can edit info pages.');
        }
        var legalIds = [
          'home'
        ];
        if (legalIds.indexOf(args.params.pageId) === -1) {
          throw new NoSuchResourceError();
        }
        return validate(args.body, {
          title: [],
          body: []
        }).then(function () {
          return trx
            .from('infoPages')
            .where('id', args.params.pageId)
            .select();
        }).then(function (pages) {
          if (!pages.length) {
            return trx
              .into('infoPages')
              .insert({
                id: args.params.pageId,
                title: args.body.title,
                body: args.body.body
              }).returning(['title', 'body']).then(function (updatedPages) {
                return updatedPages[0];
              });
          } else {
            return trx
              .into('infoPages')
              .where('id', args.params.pageId)
              .update({
                title: args.body.title,
                body: args.body.body
              }).returning(['title', 'body']).then(function (updatedPages) {
                return updatedPages[0];
              });
          }
        });
      });
    }

  };
};
