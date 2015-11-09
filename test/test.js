require('dotenv').load();
var knex = require('../server/database/knex');

// Before we do any tests, migrate the database to the latest schema.
before(function (done) {
  knex.migrate.latest().then(function () {
    done();
  });
});

require('./server/server');
