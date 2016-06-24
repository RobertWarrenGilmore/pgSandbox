'use strict'
const _ = require('lodash')
const authenticatedTransaction = require('./utilities/authenticatedTransaction')
const AuthorisationError = require('../../errors/authorisationError')
const NoSuchResourceError = require('../../errors/noSuchResourceError')
const validate = require('../../utilities/validate')
const { funcs: vf } = validate


const legalIds = [
  'home'
]

module.exports = knex => ({

  read: args =>
    authenticatedTransaction(knex, args.auth, (trx, authUser) => {
      if (legalIds.indexOf(args.params.pageId) === -1) {
        throw new NoSuchResourceError()
      }
      return trx
        .from('infoPages')
        .where('id', args.params.pageId)
        .select(['title', 'body'])
        .then(pages => {
          if (!pages.length) {
            return {
              title: '',
              body: ''
            }
          }
          return pages[0]
        })
    }),

  update: args =>
    authenticatedTransaction(knex, args.auth, function (trx, authUser) {
      if (!authUser || !authUser.admin) {
        throw new AuthorisationError('Only administrators can edit info pages.')
      }
      if (legalIds.indexOf(args.params.pageId) === -1) {
        throw new NoSuchResourceError()
      }
      return validate(args.body, {
        title: [
          vf.notNull('The title cannot be null.'),
          vf.string('The title must be a string.')
        ],
        body: [
          vf.notNull('The body cannot be null.'),
          vf.string('The body must be a string.')
        ]
      }).then(() =>
        trx
          .from('infoPages')
          .where('id', args.params.pageId)
          .select()
      ).then(pages => {
        if (!pages.length) {
          let newPage = _.clone(args.body)
          newPage.id = args.params.pageId
          return trx
            .into('infoPages')
            .insert(newPage)
            .returning(['title', 'body'])
        } else {
          return trx
            .into('infoPages')
            .where('id', args.params.pageId)
            .update(args.body)
            .returning(['title', 'body'])
        }
      })
      .then(updatedPages => updatedPages[0])
    })

})
