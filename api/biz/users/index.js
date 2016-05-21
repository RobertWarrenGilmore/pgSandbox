'use strict'
const create = require('./create')
const read = require('./read')
const update = require('./update')
const serveAvatar = require('./serveAvatar')

module.exports = (knex, emailer) => ({
  create: create(knex, emailer),
  read: read(knex),
  update: update(knex, emailer),
  serveAvatar: serveAvatar(knex)
})
