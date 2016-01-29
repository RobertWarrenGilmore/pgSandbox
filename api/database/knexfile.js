'use strict';
/**
 * This file provides database configuration parameters for Knex.
 */

var dbPassword = process.env.dbPassword;

module.exports = {

  testing: {
    client: 'postgresql',
    connection: {
      host: 'localhost',
      user: 'adjuvet',
      password: dbPassword,
      database: 'adjuvetTest',
      charset: 'utf8'
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: 'api/database/migrations',
      tableName: 'knex_migrations'
    }
  },

  development: {
    client: 'postgresql',
    connection: {
      host: 'localhost',
      user: 'adjuvet',
      password: dbPassword,
      database: 'adjuvet',
      charset: 'utf8'
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: 'api/database/migrations',
      tableName: 'knex_migrations'
    }
  },

  production: {
    client: 'postgresql',
    connection: {
      host: 'localhost',
      user: 'adjuvet',
      password: dbPassword,
      database: 'adjuvet',
      charset: 'utf8'
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: 'api/database/migrations',
      tableName: 'knex_migrations'
    }
  }

};
