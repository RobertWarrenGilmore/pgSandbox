'use strict'
/**
 * Add avatar to users.
 */

exports.up = knex =>
  knex.schema.table('users', table => {
    table.specificType('avatar', 'bytea')
      .comment('a JPEG format avatar')
  })

exports.down = knex =>
  knex.schema.table('users', table => {
    table.dropColumn('avatar')
  })
