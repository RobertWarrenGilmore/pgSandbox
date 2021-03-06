'use strict'
/**
 * This file provides database configuration parameters for Knex.
 */

const dbPassword = process.env.dbPassword

module.exports = {

  testing: {
    client: 'postgresql',
    connection: {
      host: 'localhost',
      user: 'sandboxUser',
      password: dbPassword,
      database: 'sandboxTest',
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
      directory: 'api/database/migrations',
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
      directory: 'api/database/migrations',
      tableName: 'knex_migrations'
    }
  }

}
