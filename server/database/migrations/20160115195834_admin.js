/**
 * This migration adds an admin flag to user.
 */

exports.up = function (knex) {
  return knex.schema.table('users', function (table) {
    table.boolean('admin').notNullable().defaultTo(false)
      .comment('whether the user is an administrator');
  });
};

exports.down = function (knex) {
  return knex.schema.table('users', function (table) {
    table.dropColumn('admin');
  });
};
