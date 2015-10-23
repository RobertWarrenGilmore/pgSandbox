var knexFile = require('./knexfile');
/* istanbul ignore next */
var knexConfig = (process.env.NODE_ENV === 'production' ?
  knexFile.production :
  knexFile.development);
var knex = require('knex')(knexConfig);

// knex.destroy();

module.exports = knex;
