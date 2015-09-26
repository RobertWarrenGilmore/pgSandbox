/**
 * This migration adds the column passwordResetKey in table users.
 */

exports.up = function (knex) {
  return knex.schema.table('users', function (table) {
    table.string('passwordResetKeyHash').comment('the salted hash of the key that can be used to reset the user\'\'s password');
  });
};

exports.down = function (knex) {
  return knex.schema.table('users', function (table) {
    table.dropColumn('passwordResetKeyHash');
  });
};
