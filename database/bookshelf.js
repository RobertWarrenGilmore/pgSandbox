var knexFile = require('./knexfile');
var knexConfig = (process.env.NODE_ENV === 'production' ?
  knexFile.production :
  knexFile.development);
var knex = require('knex')(knexConfig);
var bookshelf = require('bookshelf')(knex);

bookshelf.plugin('registry');
bookshelf.plugin('virtuals');
bookshelf.plugin('visibility');

// knex.destroy();

module.exports = bookshelf;
