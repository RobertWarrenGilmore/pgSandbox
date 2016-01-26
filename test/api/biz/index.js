var knex = require('../../../api/database/knex');

describe('biz', function () {

  before('Migrate the database to the latest schema.', function () {
    return knex.migrate.latest();
  });

  after('Roll back the database.', function () {
    return knex.migrate.rollback();
  });

  // a list of all of the biz test modules to run
  require('./user');
  require('./blogPost');
  require('./infoPage');
});
