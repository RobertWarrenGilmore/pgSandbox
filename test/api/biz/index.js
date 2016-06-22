'use strict'
const knex = require('../../../api/database/knex')

describe('biz', () => {

  before('Migrate the database to the latest schema.', () =>
    knex.migrate.latest()
  )

  after('Roll back the database.', () =>
    knex.migrate.rollback()
  )

  // a list of all of the biz test modules to run
  require('./users')
  require('./blogPosts')
  require('./infoPages')
})
