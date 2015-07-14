var knex = require('knex')({
  client: 'pg',
  connection: {
    host: 'localhost',
    user: 'sandboxUser',
    password: process.env.sandboxDbPassword,
    database: 'sandbox',
    charset: 'utf8'
  }
});
var bookshelf = require('bookshelf')(knex);
// knex.destroy();

module.exports = {};
