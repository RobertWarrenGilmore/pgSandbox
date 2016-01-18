/**
 * Add Users, info pages, and blog posts.
 */

exports.up = function (knex) {
  return knex.raw('create extension if not exists unaccent').then(function () {
    return knex.schema.createTable('users', function (table) {
      table.increments();
      table.string('emailAddress')
        .comment('the email address of the user')
        .unique().notNullable();
      table.string('passwordHash')
        .comment('the salted hash of the user\'\'s password');
      table.string('passwordResetKeyHash')
        .comment('the salted hash of the key that can be used to reset the user\'\'s password');
      table.string('givenName')
        .comment('the user\'\'s given name (or first name)');
      table.string('familyName')
        .comment('the user\'\'s family name (or last name)');
      table.boolean('active').notNullable().defaultTo(true)
        .comment('whether the user\'\'s account is active');
      table.boolean('authorisedToBlog').notNullable().defaultTo(false)
        .comment('whether the user is authorised to create, edit, and delete blog posts');
      table.boolean('admin').notNullable().defaultTo(false)
        .comment('whether the user is an administrator');
    });
  }).then(function () {
    return knex.schema.createTable('infoPages', function (table) {
      table.string('id').primary()
        .comment('a unique name identifying the page');
      table.text('title').notNullable().defaultTo('')
        .comment('the title of the page');
      table.text('body').notNullable().defaultTo('')
        .comment('the prose');
    });
  }).then(function () {
    return knex.schema.createTable('blogPosts', function (table) {
      table.string('id').primary()
        .comment('a unique name identifying the post');
      table.string('title').notNullable().defaultTo('')
        .comment('the title of the post');
      table.integer('author').notNullable().references('users.id')
        .comment('the identity of the author (a user) for the byline of the post');
      table.text('body').notNullable().defaultTo('')
        .comment('the body of the post');
      table.text('preview')
        .comment('a short preview of the post to be shown in a list of posts');
      table.dateTime('postedTime').notNullable().defaultTo(knex.fn.now())
        .comment('a time by which to sort the posts');
      table.boolean('active').notNullable().defaultTo(true)
        .comment('whether the page is meant to be available');
    });
  });
};

exports.down = function (knex) {
  return knex.raw('drop extension if exists unaccent').then(function () {
    return knex.schema.dropTable('blogPosts');
  }).then(function () {
    return knex.schema.dropTable('infoPages');
  }).then(function () {
    return knex.schema.dropTable('users');
  });
};
