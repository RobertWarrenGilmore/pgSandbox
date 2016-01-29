'use strict';
var knexFile = require('./knexfile');
var configName = process.env.NODE_ENV || 'development';
var knexConfig = knexFile[configName];
var knex = require('knex')(knexConfig);

module.exports = knex;
