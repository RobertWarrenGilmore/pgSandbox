/**
 * This migration adds an authorisedToBlog flag to user.
 */

exports.up = function (knex) {
  return knex.schema.table('users', function (table) {
    table.boolean('authorisedToBlog').notNullable().defaultTo(false)
      .comment('whether the user is authorised to create, edit, and delete blog posts');
  });
};

exports.down = function (knex) {
  return knex.schema.table('users', function (table) {
    table.dropColumn('authorisedToBlog');
  });
};
