var assert = require('assert');
var User = require('../models/user');

describe('the user model', function () {
  var emailAddress = 'mocha.test.email.address@not.a.real.domain.com';
  var password = 'taco tuesday';

  it('should be able to be created', function (done) {
    new User({
      emailAddress: emailAddress,
      password: password
    }).save().then(function () {
      done();
    }).catch(function (err) {
      done(err);
    });
  });

  it('should be able to authenticate', function (done) {
    User.authenticate(emailAddress, password).then(function () {
      done();
    }).catch(function (err) {
      done(err);
    });
  });

  it('should fail to authenticate when given the wrong password', function (done) {
    User.authenticate(emailAddress, password + 'a').then(function () {
      done(new Error('The user logged in successfully with the wrong password.'));
    }, function () {
      done();
    }).catch(function (err) {
      done(err);
    });
  });

  it('should be able to update its email address', function (done) {
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

  it('should not be able to set an invalid email address', function (done) {
    var mod = 'NotAValidEmailAddress.com';

    // Fetch the user.
    new User({
      emailAddress: emailAddress
    }).fetch().then(function (user) {

      // Modify the email address.
      return user.set('emailAddress', mod).save();

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

  it('should be able to update its password', function (done) {
    var expectedMod = password + 'a';
    var authenticated;
    // Fetch the user.
    new User({
      emailAddress: emailAddress
    }).fetch().then(function (user) {

      // Modify the password.
      return user.set('password', expectedMod).save();

    }).then(function (user) {

      // Does the new password work after the update?
      authenticated = user.get('emailAddress');

      // Revert to the original password.
      return user.set('password', password).save();

    }).then(function () {

      assert(authenticated,
        'Logging in with the changed password failed.');

      done();
    }).catch(function (err) {
      done(err);
    });
  });

  it('should be able to be deleted', function (done) {
    new User({
      emailAddress: emailAddress
    }).fetch().then(function (user) {
      user.destroy().then(function () {
        done();
      }).catch(function (err) {
        done(err);
      });
    });
  });

  it('should fail to be created when its email address is omitted', function (done) {
    new User({
      password: password
    }).save().then(

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

  after(function () {
    new User({
      emailAddress: emailAddress
    }).fetch().then(function (user) {
      user.destroy();
    });
  });
});
