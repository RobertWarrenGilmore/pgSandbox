require('dotenv').load();
process.env.NODE_ENV = 'testing';
var knex = require('../server/database/knex');
var Promise = require('bluebird');

before('Configure promises.', function () {
  Promise.config({
    cancellation: true
  });
});

require('./server/server');
