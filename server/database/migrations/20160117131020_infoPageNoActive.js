/**
 * This migration removes the column active from infoPages.
 */

exports.up = function (knex) {
  return knex.schema.table('infoPages', function (table) {
    table.dropColumn('active');
  });
};

exports.down = function (knex) {
  return knex.schema.table('infoPages', function (table) {
    table.boolean('active').notNullable().defaultTo(true)
      .comment('whether the page is meant to be available');
  });
};
