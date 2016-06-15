'use strict'
/**
 * Add avatar to users.
 */

exports.up = knex =>
  knex.schema.table('users', table => {
    table.string('timeZone')
      .notNullable().defaultTo('America/Los_Angeles')
      .comment('the time zone in which the user sees times and creates time stamps')
  })
  .then(() =>
    knex.schema.table('blogPosts', table => {
      table.string('timeZone')
        .notNullable().defaultTo('America/Los_Angeles')
        .comment('the time zone of the time stamp')
    })
  )

exports.down = knex =>
  knex.schema.table('users', table => {
    table.dropColumn('timeZone')
  })
  .then(() =>
    knex.schema.table('blogPosts', table => {
      table.dropColumn('timeZone')
    })
  )
