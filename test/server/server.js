var knex = require('../../server/database/knex');

describe('server', function () {
  // a list of all of the server-side test modules to run
  require('./biz/biz');
  require('./transport/transport');

  after('Destroy knex.', function () {
    return knex.destroy();
  });
});
