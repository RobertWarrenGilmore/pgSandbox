/**
 * This is the initial schema and consists only of users with email addresses
 * and passwords.
 */

exports.up = function (knex, Promise) {
  return knex.schema.createTable('users', function (table) {
    table.increments();
    table.string('emailAddress').comment('the email address of the user')
      .unique().notNullable();
    table.string('passwordHash').comment('the salted hash of the user\'\'s password');
    table.timestamps();
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.dropTable('users');
};
