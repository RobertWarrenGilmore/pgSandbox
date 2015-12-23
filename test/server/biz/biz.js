var knex = require('../../../server/database/knex');

describe('biz', function () {

  beforeEach('Migrate the database to the latest schema.', function () {
    return knex.migrate.latest();
  });

  afterEach('Roll back the database.', function () {
    return knex.migrate.rollback();
  });

  // a list of all of the biz test modules to run
  require('./user');
  require('./blogPost');
});
