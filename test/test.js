var bookshelf = require('../server/models/bookshelf');

// Before we do any tests, migrate the database to the latest schema.
before(function (done) {
  bookshelf.knex.migrate.latest().then(function () {
    done();
  });
});

require('./server/server');
