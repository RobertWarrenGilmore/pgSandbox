var knex = require('../../server/database/knex');
var assert = require('assert');
var sinon = require('sinon');
var mockEmailer = sinon.stub();
var User = require('../../server/biz/user')(knex, mockEmailer);
var appUrl = require('../../package.json').appUrl;
var MalformedRequestError = require('../../server/errors/malformedRequestError');
var ConflictingEditError = require('../../server/errors/conflictingEditError');
var AuthenticationError = require('../../server/errors/authenticationError');
var AuthorisationError = require('../../server/errors/authorisationError');

var emailAddress = 'mocha.test.email.address@not.a.real.domain.com';
var badEmailAddress = 'NotAValidEmailAddress.com';
var ids = [];
var password = 'taco tuesday';
var passwordResetKey;
var givenName = 'Victor';
var familyName = 'Frankenstein';

describe('user', function () {

  beforeEach('Reset the mock emailer.', function () {
    mockEmailer.reset();
  });

  after('Delete the test users.', function () {
    return knex.from('users').where('id', 'in', ids).del();
  });

  it('should be able to create', function () {
    return User.create({
      body: {
        emailAddress: emailAddress
      }
    }).then(function (user) {
      assert(mockEmailer.withArgs(emailAddress).calledOnce, 'The emailer was not called.');
      passwordResetKey = mockEmailer.getCall(0).args[1].match(/(?:setPassword\?key=)([A-Za-z\d]+)/)[1];
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
    }).then(function () {
      assert(false, 'The update succeeded.');
    }).catch(MalformedRequestError, function () {});
  });

  it('should fail to create when the email address is not unique', function () {
    return User.create({
      body: {
        emailAddress: emailAddress
      }
    }).then(function (user) {
      assert(false, 'The creation succeeded.');
    }).catch(ConflictingEditError, function () {});
  });

  it('should fail to create with an invalid email address', function () {
    return User.create({
      body: {
        emailAddress: badEmailAddress
      }
    }).then(function (user) {
      assert(false, 'The creation succeeded.');
    }).catch(MalformedRequestError, function () {});
  });

  it('should be able to set a password anonymously with a key', function () {
    return User.update({
      params: {
        userId: ids[0]
      },
      body: {
        passwordResetKey: passwordResetKey,
        password: password
      }
    });
  });

  it('should be able to send a password reset email', function () {
    return User.update({
      body: {
        emailAddress: emailAddress,
        passwordResetKey: true
      }
    }).then(function () {
      assert(mockEmailer.calledOnce, 'The emailer was not called.');
    });
  });

  it('should be able to set a password while authenticated', function () {
    return User.update({
      auth: {
        emailAddress: emailAddress,
        password: password
      },
      params: {
        userId: ids[0]
      },
      body: {
        password: password + 'a'
      }
    }).then(function () {
      return User.update({
        auth: {
          emailAddress: emailAddress,
          password: password + 'a'
        },
        params: {
          userId: ids[0]
        },
        body: {
          password: password
        }
      });
    });
  });

  it('should fail to set a password while authenticated as someone else', function () {
    return User.create({
      body: {
        emailAddress: 'someoneElse' + emailAddress
      }
    }).then(function (user) {
      return knex.select('id').from('users').where('emailAddress', 'someoneElse' + emailAddress);
    }).then(function (users) {
      ids.push(users[0].id);
      return User.update({
        auth: {
          emailAddress: emailAddress,
          password: password
        },
        params: {
          userId: users[0].id
        },
        body: {
          password: password
        }
      });
    }).then(function () {
      assert(false, 'The update succeeded.');
    }).catch(AuthorisationError, function () {});
  });

  it('should fail to set a password with an incorrect key', function () {
    return User.update({
      params: {
        userId: ids[0]
      },
      body: {
        passwordResetKey: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcd'
          /*
          Cross your fingers and hope that the correct password reset key is one
          of the other 3.8*10^91 possibilities. If it does happen to be this
          one, we can just run the test again. Surely lightning won't
          strike us twice.
          */
      }
    }).then(function () {
      assert(false, 'The update succeeded.');
    }).catch(AuthenticationError, function () {});
  });

  it('should fail to set a too short password', function () {
    return User.update({
      auth: {
        emailAddress: emailAddress,
        password: password
      },
      params: {
        userId: ids[0]
      },
      body: {
        password: '1234567'
      }
    }).then(function () {
      assert(false, 'The update succeeded.');
    }).catch(MalformedRequestError, function () {});
  });

  it('should fail to set a too long password', function () {
    return User.update({
      auth: {
        emailAddress: emailAddress,
        password: password
      },
      params: {
        userId: ids[0]
      },
      body: {
        password: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcde'
      }
    }).then(function () {
      assert(false, 'The update succeeded.');
    }).catch(MalformedRequestError, function () {});
  });

  it('should fail to set a property that users do not have', function () {
    return User.update({
      auth: {
        emailAddress: emailAddress,
        password: password
      },
      params: {
        userId: ids[0]
      },
      body: {
        notARealProperty: 'hello'
      }
    }).then(function () {
      assert(false, 'The update succeeded.');
    }).catch(MalformedRequestError, function () {});
  });

  it('should be able to set an email address', function () {
    return User.update({
      auth: {
        emailAddress: emailAddress,
        password: password
      },
      params: {
        userId: ids[0]
      },
      body: {
        emailAddress: 'different' + emailAddress
      }
    }).then(function (user) {
      assert(user.emailAddress === 'different' + emailAddress, 'The email address is wrong.');
      return User.update({
        auth: {
          emailAddress: 'different' + emailAddress,
          password: password
        },
        params: {
          userId: ids[0]
        },
        body: {
          emailAddress: emailAddress
        }
      });
    });
  });

  it('should be able to set inactive', function () {
    return User.update({
      auth: {
        emailAddress: emailAddress,
        password: password
      },
      params: {
        userId: ids[0]
      },
      body: {
        active: false
      }
    }).then(function (user) {
      assert(!user.active, 'The user is not active.');
    });
  });

  it('should be able to set active', function () {
    return User.update({
      auth: {
        emailAddress: emailAddress,
        password: password
      },
      params: {
        userId: ids[0]
      },
      body: {
        active: true
      }
    }).then(function (user) {
      assert(user.active, 'The user is not active.');
    });
  });

  it('should fail to set inactive while authenticated as someone else', function () {
    return User.update({
      auth: {
        emailAddress: emailAddress,
        password: password
      },
      params: {
        userId: ids[1]
      },
      body: {
        active: false
      }
    }).then(function () {
      assert(false, 'The update succeeded.');
    }).catch(AuthorisationError, function () {});
  });

  it('should be able to set a given name and family name', function () {
    return User.update({
      auth: {
        emailAddress: emailAddress,
        password: password
      },
      params: {
        userId: ids[0]
      },
      body: {
        givenName: givenName,
        familyName: familyName
      }
    });
  });

  it('should be able to read', function () {
    return User.read({
      params: {
        userId: ids[0]
      }
    }).then(function (user) {
      assert.deepStrictEqual(user, {
        id: ids[0],
        emailAddress: emailAddress,
        givenName: givenName,
        familyName: familyName,
        active: true
      }, 'The returned user was incorrect.');
    });
  });

  it('should fail to authenticate with an unassigned email address');
  it('should fail to authenticate with a wrong password');
  it('should fail to set an email address on a non-existent user');

  context('with searchable users', function () {
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

    before('Create the searchable users.', function () {
      return knex.into('users').insert(searchableUsers).returning('id').then(function (returnedIds) {
        Array.prototype.push.apply(ids, returnedIds);
        Array.prototype.push.apply(searchableIds, returnedIds);
      });
    });

    after('Destroy the searchable users.', function () {
      return knex.from('users').where('id', 'in', searchableIds).del();
    });

    it('should be able to list all users', function () {
      return User.read({})
        .then(function (users) {
          assert.strictEqual(users.length, ids.length, 'The wrong number of users was returned.');
        });
    });

    it('should be able to sort the list by family name, descending');
    it('should be able to sort the list by family name, ascending');
    it('should be able to search by id');
    it('should be able to search by family name');
    it('should be able to search by family name and given name');
    it('should be fail to search with a malformed query');
    it('should be fail to search with a malformed query');
  });

  context('with a failing emailer', function () {
    function EmailerError() {}
    EmailerError.prototype = Object.create(Error.prototype);

    beforeEach('Set the emailer to throw an error.', function () {
      mockEmailer.throws(new EmailerError());
    });

    it('should fail to create', function () {
      return User.create({
        body: {
          emailAddress: emailAddress + 'a'
        }
      }).then(function (user) {
        assert(!mockEmailer.called, 'The password setting email was sent.');
        ids.push(user.id);
        assert(false, 'The creation did not fail.');
      }).catch(EmailerError, function () {});
    });

    it('should fail to send a password reset email', function () {
      return User.update({
        body: {
          emailAddress: emailAddress,
          passwordResetKey: true
        }
      }).then(function (user) {
        assert(false, 'The email was sent.');
      }).catch(EmailerError, function () {});
    });

  });
});
