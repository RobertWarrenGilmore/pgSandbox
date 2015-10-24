var user = require('./user');
var emailer = require('./emailer');

module.exports = function (knex) {
  return {
    // This list gets longer as business modules are added.
    user: user(knex, emailer)
  };
};
