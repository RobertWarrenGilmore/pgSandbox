var auth = require('./auth');
var user = require('./user');
var emailer = require('./emailer');

module.exports = function (knex) {
  return {
    // This list gets longer as business modules are added.
    auth: auth(knex),
    user: user(knex, emailer)
  };
};
