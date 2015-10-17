var assert = require('assert');
var Bookshelf = require('../../../server/models/bookshelf');
var User = Bookshelf.model('User');
var Collection = Bookshelf.Collection;
var appUrl = require('../../../package.json').appUrl;

describe('user', function () {
  var emailAddress = 'mocha.test.email.address@not.a.real.domain.com';
  var badEmailAddress = 'NotAValidEmailAddress.com';
  var password = 'taco tuesday';
  var passwordResetKey;
  var givenName = 'Victor';
  var familyName = 'Frankenstein';
  var givenName1 = 'James';
  var givenName2 = 'Paula';
  var familyName1 = 'Deen';
  var familyName2 = 'Poundstone';
  var searchableUsers = new Collection([
    new User({
      emailAddress: '0' + emailAddress,
      givenName: givenName1,
      familyName: familyName1
    }),
    new User({
      emailAddress: '1' + emailAddress,
      givenName: givenName2,
      familyName: familyName1
    }),
    new User({
      emailAddress: '2' + emailAddress,
      givenName: givenName2,
      familyName: familyName2
    })
  ]);

  before(function (done) {
    searchableUsers.invokeThen('save').then(function () {
      done();
    });
  });

  after(function () {
    new User({
      emailAddress: emailAddress
    }).fetch().then(function (user) {
      if (user) {
        user.destroy();
      }
    });
    searchableUsers.invokeThen('destroy');
  });

  it('should be able to be created', function (done) {
    new User({
      emailAddress: emailAddress
    }).save().then(function () {
      done();
    }).catch(function (err) {
      done(err);
    });
  });

  it('should be able to be created and deleted in a transaction', function (done) {
    Bookshelf.transaction(function (trx) {
      return new User({
        emailAddress: emailAddress + 'trx'
      }).save(null, null, null, {
        transacting: trx
      }).then(function (user) {
        return user.destroy();
      }).then(function () {
        done();
      }).catch(function (err) {
        done(err);
      });
    });
  });

  it('should be active by default', function (done) {
    new User({
      emailAddress: emailAddress
    }).fetch().then(function (user) {
      var active = user.get('active');
      assert(active, 'The user was inactive just after creation.');
      done();
    }).catch(function (err) {
      done(err);
    });
  });

  it('should fail to be created when its email address is omitted', function (done) {
    new User({}).save().then(

      // Successfully created.
      function (user) {
        user.destroy().then(function () {
          done(new Error('The user was successfully created without an email address.'));
        });
      },

      // Failed to create.
      function () {
        done();
      }

    ).catch(function (err) {
      done(err);
    });
  });

  it('should fail to be created when its email address is not unique', function (done) {
    new User({
      emailAddress: emailAddress
    }).save().then(

      // Successfully created.
      function (user) {
        user.destroy().then(function () {
          done(new Error('The user was successfully created with an already used email address.'));
        });
      },

      // Failed to create.
      function () {
        done();
      }

    ).catch(function (err) {
      done(err);
    });
  });

  it('should fail to be created with an invalid email address', function (done) {
    new User({
      emailAddress: badEmailAddress
    }).save().then(

      // Successfully created.
      function (user) {
        user.destroy().then(function () {
          done(new Error('The user was successfully created with an already used email address.'));
        });
      },

      // Failed to create.
      function () {
        done();
      }

    ).catch(function (err) {
      done(err);
    });
  });

  it('should be able to set its password', function (done) {
    new User({
      emailAddress: emailAddress
    }).fetch().then(function (user) {

      // Set the password.
      user.setPassword(password);
      return user.save();

    }).then(function () {
      done();
    }).catch(function (err) {
      done(err);
    });
  });

  it('should fail to set a too short password', function (done) {
    new User({
      emailAddress: emailAddress
    }).fetch().then(function (user) {
      // Set a password 7 characters long.
      user.setPassword('1234567');
      done(new Error('Set a too short password.'));
    }).catch(function () {
      done();
    });
  });

  it('should fail to set a too long password', function (done) {
    new User({
      emailAddress: emailAddress
    }).fetch().then(function (user) {
      // Set a password 31 characters long.
      user.setPassword('ABCDEFGHIJKLMNOPQRSTUVWXYZabcde');
      done(new Error('Set a too long password.'));
    }).catch(function () {
      done();
    });
  });

  it('should be able to verify its password', function (done) {
    new User({
      emailAddress: emailAddress
    }).fetch().then(function (user) {
      var authenticated = user.verifyPassword(password);
      if (authenticated) {
        done();
      } else {
        done(new Error('Authentication failed.'));
      }
    }).catch(function (err) {
      done(err);
    });
  });

  it('should fail to verify a too short password', function (done) {
    new User({
      emailAddress: emailAddress
    }).fetch().then(function (user) {
      var authenticated = user.verifyPassword('1234567');
      if (authenticated) {
        done(new Error('Verified a too short password.'));
      } else {
        done(new Error('Did not throw an error while verifying a too short password.'));
      }
    }).catch(function () {
      done();
    });
  });

  it('should fail to verify a too long password', function (done) {
    new User({
      emailAddress: emailAddress
    }).fetch().then(function (user) {
      var authenticated = user.verifyPassword('ABCDEFGHIJKLMNOPQRSTUVWXYZabcde');
      if (authenticated) {
        done(new Error('Verified a too long password.'));
      } else {
        done(new Error('Did not throw an error while verifying a too long password.'));
      }
    }).catch(function () {
      done();
    });
  });

  it('should fail to verify an incorrect password', function (done) {
    new User({
      emailAddress: emailAddress
    }).fetch().then(function (user) {
      var authenticated = user.verifyPassword(password + 'a');
      if (authenticated) {
        done(new Error('The user logged in successfully with the wrong password.'));
      } else {
        done();
      }
    });
  });

  it('should be able to generate a password reset key', function (done) {
    new User({
      emailAddress: emailAddress
    }).fetch().then(function (user) {
      passwordResetKey = user.generatePasswordResetKey();
      return user.save();
    }).then(function () {

      // Validate the format of the key.
      if (typeof passwordResetKey === 'string' && passwordResetKey.match(/^[A-Za-z0-9]{30}$/)) {
        done();
      } else {
        done(new Error('The key was not a string of 30 alphanumerics.'));
      }

    }).catch(function (err) {
      done(err);
    });
  });

  it('should be able to verify its password reset key', function (done) {
    new User({
      emailAddress: emailAddress
    }).fetch().then(function (user) {

      var keyValid = user.verifyPasswordResetKey(passwordResetKey);
      if (keyValid) {
        var keyCleared = !user.has('passwordResetKeyHash');
        if (keyCleared) {
          done();
        } else {
          done(new Error('The key was not cleared after validation.'));
        }
      } else {
        done(new Error('The key failed to validate.'));
      }

    }).catch(function (err) {
      done(err);
    });
  });

  it('should fail to verify an incorrect password reset key', function (done) {
    new User({
      emailAddress: emailAddress
    }).fetch().then(function (user) {

      var keyValid = user.verifyPasswordResetKey(passwordResetKey + 'a');
      if (keyValid) {
        done(new Error('An incorrect key validated successfully.'));
      } else {
        done();
      }

    }).catch(function (err) {
      done(err);
    });
  });

  it('should be able to set its email address', function (done) {
    var expectedMod = emailAddress + 'a';
    var actualMod;

    // Fetch the user.
    new User({
      emailAddress: emailAddress
    }).fetch().then(function (user) {

      // Modify the email address.
      return user.set('emailAddress', expectedMod).save();

    }).then(function (user) {

      // What is the email address after the update?
      actualMod = user.get('emailAddress');

      // Revert to the original email address.
      return user.set('emailAddress', emailAddress).save();

    }).then(function () {

      assert.notStrictEqual(actualMod, emailAddress,
        'The email address was not changed.');
      assert.strictEqual(actualMod, expectedMod,
        'The email address was changed incorrectly.');

      done();
    }).catch(function (err) {
      done(err);
    });
  });

  it('should fail to set an invalid email address', function (done) {

    // Fetch the user.
    new User({
      emailAddress: emailAddress
    }).fetch().then(function (user) {

      // Modify the email address.
      return user.set('emailAddress', badEmailAddress).save();

    }).then(

      // Successfully changed.
      function (user) {
        // Revert to the original email address.
        user.set('emailAddress', emailAddress)
          .save().then(function () {
            done(new Error('The user\'s email address was successfully changed to something invalid.'));
          });
      },

      // Failed to change.
      function () {
        done();
      }
    ).catch(function (err) {
      done(err);
    });
  });

  it('should be able to set itself inactive', function (done) {
    new User({
      emailAddress: emailAddress
    }).fetch().then(function (user) {
      var active = user.get('active');
      assert(active, 'The user was already inactive.');
      return user.set('active', false).save();
    }).then(function (user) {
      var active = user.get('active');
      assert(!active, 'The user is still active.');
      done();
    }).catch(function (err) {
      done(err);
    });
  });

  it('should be able to set itself active', function (done) {
    new User({
      emailAddress: emailAddress
    }).fetch().then(function (user) {
      var active = user.get('active');
      assert(!active, 'The user was already active.');
      return user.set('active', true).save();
    }).then(function (user) {
      var active = user.get('active');
      assert(active, 'The user is still inactive.');
      done();
    }).catch(function (err) {
      done(err);
    });
  });

  it('should be able to set its given name', function (done) {
    new User({
      emailAddress: emailAddress
    }).fetch().then(function (user) {
      return user.set('givenName', givenName).save();
    }).then(function (user) {
      var actualGivenName = user.get('givenName');
      assert.strictEqual(actualGivenName, givenName, 'The given name was not set properly.');
      done();
    }).catch(function (err) {
      done(err);
    });
  });

  it('should be able to set its family name', function (done) {
    new User({
      emailAddress: emailAddress
    }).fetch().then(function (user) {
      return user.set('familyName', familyName).save();
    }).then(function (user) {
      var actualFamilyName = user.get('familyName');
      assert.strictEqual(actualFamilyName, familyName, 'The family name was not set properly.');
      done();
    }).catch(function (err) {
      done(err);
    });
  });

  it('should be able to fetch itself by ID', function (done) {
    new User({
      emailAddress: emailAddress
    }).fetch().then(function (user) {
      var id = user.get('id');
      return new User({
        id: id
      }).fetch();
    }).then(function (user) {
      assert.strictEqual(user.get('emailAddress'), emailAddress, 'The user fetched by ID did not have the expected email address.');
      done();
    }).catch(function (err) {
      done(err);
    });
  });

  it('should fail to fetch with an improper email address', function () {
    return new User({
      emailAddress: badEmailAddress
    }).fetch().then(function (user) {
      assert.strictEqual(user, null, 'A user was found.');
    });
  });

  it('should be able to generate its URI', function () {
    return new User({
      emailAddress: emailAddress
    }).fetch().then(function (user) {
      var actualUri = user.get('uri');
      var expectedUri = appUrl + '/users/' + user.get('id');
      assert.strictEqual(actualUri, expectedUri, 'The URI was wrong.');
    });
  });

  it('should be able to be deleted', function () {
    return new User({
      emailAddress: emailAddress
    }).fetch().then(function (user) {
      return user.destroy();
    });
  });

  it('should be able to list all users', function () {
    return User.fetchAll().then(function (searchedUsers) {
      assert.strictEqual(searchedUsers.length, 3, 'The wrong number of users was returned.');
    });
  });

  it('should be able to sort the list by family name, descending', function () {
    return User.query(function (qb) {
      qb.orderBy('familyName', 'desc');
    }).fetchAll().then(function (searchedUsers) {
      assert.strictEqual(searchedUsers.length, 3, 'The wrong number of users was returned.');
      assert.strictEqual(searchedUsers.at(0).get('familyName'), familyName2, 'The wrong family name was at the start of the list.');
    });
  });

  it('should be able to sort the list by family name, ascending', function () {
    return User.query(function (qb) {
      qb.orderBy('familyName', 'asc');
    }).fetchAll().then(function (searchedUsers) {
      assert.strictEqual(searchedUsers.length, 3, 'The wrong number of users was returned.');
      assert.strictEqual(searchedUsers.at(0).get('familyName'), familyName1, 'The wrong family name was at the start of the list.');
    });
  });

  it('should be able to search by family name', function () {
    return User.query(function (qb) {
      qb.where('familyName', familyName1);
    }).fetchAll().then(function (searchedUsers) {
      assert.strictEqual(searchedUsers.length, 2, 'The wrong number of users was returned.');
      assert.strictEqual(searchedUsers.at(0).get('familyName'), familyName1, 'A result did not satisfy the intended search.');
      assert.strictEqual(searchedUsers.at(1).get('familyName'), familyName1, 'A result did not satisfy the intended search.');
    });
  });

  it('should be able to search by family name and given name', function () {
    return User.query(function (qb) {
      qb.where({
        givenName: givenName2,
        familyName: familyName1
      });
    }).fetchAll().then(function (searchedUsers) {
      assert.strictEqual(searchedUsers.length, 1, 'The wrong number of users was returned.');
      assert.strictEqual(searchedUsers.at(0).get('givenName'), givenName2, 'The found user was not the right one.');
      assert.strictEqual(searchedUsers.at(0).get('familyName'), familyName1, 'The found user was not the right one.');
    });
  });
});
