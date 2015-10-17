var knex = require('../../../server/database/knex');
var assert = require('assert');
var sinon = require('sinon');
var mockEmailer = sinon.stub();
var User = require('../../../server/biz/user')({
  knex: knex,
  emailer: mockEmailer
});
var appUrl = require('../../../package.json').appUrl;

var emailAddress = 'mocha.test.email.address@not.a.real.domain.com';
var id;
var password = 'taco tuesday';
var passwordResetKey;
var givenName = 'Victor';
var familyName = 'Frankenstein';

describe('user', function () {

  it('should be able to create', function () {
    return User.create({
      auth: null,
      params: null,
      body: {
        emailAddress: emailAddress
      }
    }).then(function (user) {
      assert(mockEmailer.withArgs(emailAddress).calledOnce);
      passwordResetKey = mockEmailer.getCall(0).args[1].match(/(?:setPassword\?key=)([A-Za-z\d]+)/)[0];
      return knex.select().from('users').where('emailAddress', emailAddress);
    }).then(function (user) {
      assert(user, 'No user was created.');
      id = user.id;
    });
  });

});
