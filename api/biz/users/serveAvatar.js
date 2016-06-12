'use strict'
const authenticatedTransaction = require('../utilities/authenticatedTransaction')
const validate = require('../../../utilities/validate')
const { funcs: vf } = validate
const NoSuchResourceError = require('../../errors/noSuchResourceError')
const fs = require('fs')
const path = require('path')

const defaultAvatar = fs.readFileSync(path.join(
  '.', 'client', 'assets', 'images', 'defaultAvatar.jpg'
))

module.exports = knex => args => authenticatedTransaction(knex, args.auth, (trx, authUser) => {

  return validate(args.params, {
    userId: [
      vf.notUndefined('The user id is required.'),
      vf.notNull('The user id is required.'),
      vf.naturalNumber('The user id must be a natural number.'),
      val => {
        if (val)
          return trx
            .from('users')
            .where('id', val)
            .select('id')
            .then(rows => {
              if (!rows.length)
                throw new NoSuchResourceError('There is no such user.')
            })
      }
    ]
  })
  .then(() =>
    trx
      .from('users')
      .where({
        id: args.params.userId
      })
      .select('avatar')
      .then(items => {
        if (!items.length || !items[0].avatar)
          return defaultAvatar
        return items[0].avatar
      })
  )
})
