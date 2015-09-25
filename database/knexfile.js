/**
 * This file provides database configuration parameters for Knex.
 */

// Read the database password that was set in npm postinstall.
var fs = require('fs');
var path = require('path');
var dbPassword = fs.readFileSync(path.join(__dirname, '/dbPassword'))
  .toString().trim();

module.exports = {

  development: {
    client: 'postgresql',
    connection: {
      host: 'localhost',
      user: 'sandboxUser',
      password: dbPassword,
      database: 'sandbox',
      charset: 'utf8'
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: 'database/migrations',
      tableName: 'knex_migrations'
    }
  },

  production: {
    client: 'postgresql',
    connection: {
      host: 'localhost',
      user: 'sandboxUser',
      password: dbPassword,
      database: 'sandbox',
      charset: 'utf8'
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  }

};
