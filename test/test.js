require('dotenv').load();
process.env.NODE_ENV = 'testing';
var knex = require('../server/database/knex');
var Promise = require('bluebird');

before('Migrate the database to the latest schema.', function () {
  return knex.migrate.latest();
});

before('Configure promises.', function () {
  Promise.config({
    cancellation: true
  });
});

after('Roll back the database.', function () {
  return knex.migrate.rollback();
});

after('Destroy Knex.', function () {
  return knex.destroy();
});

require('./server/server');
