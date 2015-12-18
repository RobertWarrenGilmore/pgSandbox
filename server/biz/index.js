var auth = require('./auth');
var infoPage = require('./infoPage');
var blogPost = require('./blogPost');
var user = require('./user');
var emailer = require('./utilities/emailer');

module.exports = function (knex) {
  return {
    // This list gets longer as business modules are added.
    auth: auth(knex),
    infoPage: infoPage(knex),
    blogPost: blogPost(knex),
    user: user(knex, emailer)
  };
};
