var dbPassword = require('./dbPassword');

var knex = require('knex')({
  client: 'pg',
  connection: {
    host: 'localhost',
    user: 'sandboxUser',
    password: dbPassword,
    database: 'sandbox',
    charset: 'utf8'
  }
});
var bookshelf = require('bookshelf')(knex);
// knex.destroy();

module.exports = {};
