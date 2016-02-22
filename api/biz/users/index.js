'use strict'
var create = require('./create')
var read = require('./read')
var update = require('./update')

module.exports = function (knex, emailer) {
  return {
    create: create(knex, emailer),
    read: read(knex),
    update: update(knex, emailer)
  }
}
