'use strict'
/**
 * Makes given name and family name of users no longer nullable.
 */

exports.up = knex =>
  knex.into('users').whereNull('givenName').update({givenName: 'John'})
    .then(() => knex.into('users').whereNull('familyName').update({familyName: 'Doe'}))
    .then(() => knex
      .raw('alter table "users" alter column "givenName" set not null; ' +
        'alter table "users" alter column "givenName" set default \'John\'; ' +
        'alter table "users" alter column "familyName" set not null; ' +
        'alter table "users" alter column "familyName" set default \'Doe\';')
    )

exports.down = knex =>
  knex
    .raw('alter table "users" alter column "givenName" drop not null; ' +
    'alter table "users" alter column "givenName" drop default; ' +
    'alter table "users" alter column "familyName" drop not null; ' +
    'alter table "users" alter column "familyName" drop default;')
