/**
 * This migration adds a table blogPosts to hold the posts of the blog.
 */

exports.up = function (knex) {
  return knex.schema.createTable('blogPosts', function (table) {
    table.string('id').primary()
      .comment('a unique name identifying the post');
    table.string('title')
      .comment('the title of the post');
    table.integer('author').references('users.id')
      .comment('the identity of the author (a user) for the byline of the post');
    table.text('body').notNullable()
      .comment('the body of the post');
    table.dateTime('postedTime').defaultTo(knex.fn.now())
      .comment('a time by which to sort the posts');
    table.boolean('active').notNullable().defaultTo(true)
      .comment('whether the page is meant to be available');
    table.timestamps();
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('blogPosts');
};
