/**
 * This migration adds a title to infoPages and renames text to body.
 */

exports.up = function (knex) {
  return knex.schema.table('infoPages', function (table) {
    table.text('title').notNullable().defaultTo('')
      .comment('the title of the page');
    table.renameColumn('text', 'body');
  });
};

exports.down = function (knex) {
  return knex.schema.table('infoPages', function (table) {
    table.dropColumn('title');
    table.renameColumn('body', 'text');
  });
};
