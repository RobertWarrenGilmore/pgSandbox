/**
 * This migration adds the columns givenName, familyName, and active in table users.
 */
console.log('Superuser permissions are needed to do this migration. Do it manually with a superuser.');

exports.up = function (knex) {
  return knex.raw('create extension if not exists unaccent');
};

exports.down = function (knex) {
  return knex.raw('drop extension if exists unaccent');
};
