var _ = require('lodash');
var authenticatedTransaction = require('./utilities/authenticatedTransaction');
var AuthorisationError = require('../errors/authorisationError');
var NoSuchResourceError = require('../errors/noSuchResourceError');
var validate = require('./utilities/validate');

var legalIds = [
  'home'
];

module.exports = function (knex) {

  return {

    read: function (args) {
      return authenticatedTransaction(knex, args.auth, function (trx, authUser) {
        if (legalIds.indexOf(args.params.pageId) === -1) {
          throw new NoSuchResourceError();
        }
        return trx
          .from('infoPages')
          .where('id', args.params.pageId)
          .select(['title', 'body'])
          .then(function (pages) {
            if (!pages.length) {
              return {
                title: '',
                body: ''
              };
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
        if (legalIds.indexOf(args.params.pageId) === -1) {
          throw new NoSuchResourceError();
        }
        return validate(args.body, {
          title: [
            'notNull'
          ],
          body: [
            'notNull'
          ]
        }).then(function () {
          return trx
            .from('infoPages')
            .where('id', args.params.pageId)
            .select();
        }).then(function (pages) {
          if (!pages.length) {
            var newPage = _.clone(args.body);
            newPage.id = args.params.pageId;
            return trx
              .into('infoPages')
              .insert(newPage)
              .returning(['title', 'body'])
              .then(function (updatedPages) {
                return updatedPages[0];
              });
          } else {
            return trx
              .into('infoPages')
              .where('id', args.params.pageId)
              .update(args.body)
              .returning(['title', 'body'])
              .then(function (updatedPages) {
                return updatedPages[0];
              });
          }
        });
      });
    }

  };
};
