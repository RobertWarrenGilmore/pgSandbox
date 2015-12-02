require('dotenv').load();
var knex = require('../server/database/knex');
var Promise = require('bluebird');

// Migrate the database to the latest schema.
before(function (done) {
  knex.migrate.latest().then(function () {
    done();
  });
});

// Canfigure promises.
before(function () {
  Promise.config({
    cancellation: true
  });
});

require('./server/server');
