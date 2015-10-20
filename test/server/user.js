var knex = require('../../server/database/knex');
var assert = require('assert');
var sinon = require('sinon');
var mockEmailer = sinon.stub();
var User = require('../../server/biz/user')(knex, mockEmailer);
var appUrl = require('../../package.json').appUrl;
var MalformedRequestError = require('../../server/errors/malformedRequestError');
var ConflictingEditError = require('../../server/errors/conflictingEditError');

var emailAddress = 'mocha.test.email.address@not.a.real.domain.com';
var badEmailAddress = 'NotAValidEmailAddress.com';
var ids = [];
var password = 'taco tuesday';
var passwordResetKey;
var givenName = 'Victor';
var familyName = 'Frankenstein';
var searchableIds = [];
var givenName1 = 'James';
var givenName2 = 'Paula';
var familyName1 = 'Deen';
var familyName2 = 'Poundstone';
var searchableUsers = [{
  emailAddress: '0' + emailAddress,
  givenName: givenName1,
  familyName: familyName1
}, {
  emailAddress: '1' + emailAddress,
  givenName: givenName2,
  familyName: familyName1
}, {
  emailAddress: '2' + emailAddress,
  givenName: givenName2,
  familyName: familyName2
}];

describe('user', function () {

  beforeEach(function () {
    mockEmailer.reset();
  });

  after(function () {
    return knex.from('users').where('id', 'in', ids).del();
  });

  it('should be able to create', function () {
    return User.create({
      body: {
        emailAddress: emailAddress
      }
    }).then(function (user) {
      assert(mockEmailer.withArgs(emailAddress).calledOnce, 'The emailer was not called.');
      passwordResetKey = mockEmailer.getCall(0).args[1].match(/(?:setPassword\?key=)([A-Za-z\d]+)/)[0];
      return knex.select().from('users').where('emailAddress', emailAddress);
    }).then(function (user) {
      assert(user[0], 'No user was created.');
      ids.push(user[0].id);
    });
  });

  it('should be active by default', function () {
    return User.read({
      params: {
        userId: ids[0]
      }
    }).then(function (user) {
      assert(!(user instanceof Array), 'The result was an array rather than a single user.');
      assert(user.active, 'The user is not active.');
    });
  });

  it('should fail to create when the email address is omitted', function () {
    return User.create({
      body: {}
    }).catch(MalformedRequestError, function () {});
  });

  it('should fail to create when the email address is not unique', function () {
    return User.create({
      body: {
        emailAddress: emailAddress
      }
    }).catch(ConflictingEditError, function () {});
  });

  it('should fail to create with an invalid email address', function () {
    return User.create({
      body: {
        emailAddress: badEmailAddress
      }
    }).catch(MalformedRequestError, function () {});
  });

  it('should be able to send a password reset email');
  it('should be able to set a password while authenticated');
  it('should fail to set a password while authenticated as someone else');
  it('should be able to set a password anonymously with a key');
  it('should fail to set a password with an incorrect key');
  it('should fail to set a too short password');
  it('should fail to set a too long password');
  it('should fail to set a property that users do not have');
  it('should be able to set an email address');
  it('should be able to read');
  it('should be able to set inactive');
  it('should be able to set active');
  it('should fail to set inactive while authenticated as someone else');
  it('should be able to set a given name and family name');
  it('should be able to list all users');
  it('should be able to sort the list by family name, descending');
  it('should be able to sort the list by family name, ascending');
  it('should be able to search by id');
  it('should be able to search by family name');
  it('should be able to search by family name and given name');
  it('should be fail to search with a malformed query');
  it('should be fail to search with a malformed query');
  it('should fail to authenticate with an unassigned email address');
  it('should fail to authenticate with a wrong password');
  it('should fail to set an email address on a non-existent user');

  context('with a failing emailer', function () {
    function MyCustomError() {}
    MyCustomError.prototype = Object.create(Error.prototype);

    beforeEach(function () {
      mockEmailer.throws(new MyCustomError());
    });

    it('should fail to create', function () {
      return User.create({
        body: {
          emailAddress: emailAddress + 'a'
        }
      }).then(function (user) {
        assert(!mockEmailer.called, 'The password setting email was sent.');
        ids.push(user.id);
        throw new Error('The creation did not fail.');
      }).catch(MyCustomError, function () {});
    });

    it('should fail to send a password reset email', function () {
      return User.update({
        body: {
          emailAddress: emailAddress,
          passwordResetKey: true
        }
      }).then(function (user) {
        assert(false, 'The email was sent.');
      }).catch(MyCustomError, function () {});
    });

  });
});
