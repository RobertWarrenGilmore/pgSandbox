/**
 * This migration adds the columns givenName, familyName, and active in table users.
 */

exports.up = function (knex) {
  return knex.schema.table('users', function (table) {
    table.string('givenName').comment('the user\'\'s given name (or first name)');
    table.string('familyName').comment('the user\'\'s family name (or last name)');
    table.boolean('active').notNullable().defaultTo(true).comment('whether the user\'\'s account is active');
  });
};

exports.down = function (knex) {
  return knex.schema.table('users', function (table) {
    table.dropColumn('givenName');
    table.dropColumn('familyName');
    table.dropColumn('active');
  });
};
