/**
 * This migration adds a table infoPages to hold informational prose.
 */

exports.up = function (knex) {
  return knex.schema.createTable('infoPages', function (table) {
    table.string('id').primary()
      .comment('a unique name identifying the page');
    table.text('text').notNullable()
      .comment('the prose');
    table.boolean('active').notNullable().defaultTo(true)
      .comment('whether the page is meant to be available');
    table.timestamps();
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('infoPages');
};
