var knexFile = require('./knexfile.js');
var knexConfig = (process.env.NODE_ENV=='production'?
  knexFile.production:
  knexFile.development);
var knex = require('knex')(knexConfig);
var bookshelf = require('bookshelf')(knex);
// knex.destroy();

exports = {};
