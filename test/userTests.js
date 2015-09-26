var assert = require('assert');
var User = require('../models/user');

describe('the user model', function () {
  var emailAddress = 'mocha.test.email.address@not.a.real.domain.com';
  var password = 'taco tuesday';
  var passwordResetKey;

  it('should be able to be created', function (done) {
    new User({
      emailAddress: emailAddress
    }).save().then(function () {
      done();
    }).catch(function (err) {
      done(err);
    });
  });

  it('should be able to generate a password reset key', function (done) {
    new User({
      emailAddress: emailAddress
    }).fetch().then(function (user) {
      return user.generatePasswordResetKey();
    }).then(function (key) {
      passwordResetKey = key;
      if (typeof key === 'string' && key.match(/^[A-Za-z0-9]{30}$/)) {
        done();
      } else {
        done(new Error('The key was not a string of 30 alphanumerics.'));
      }
    }).catch(function (err) {
      done(err);
    });
  });

  it('should be able to set its password', function (done) {
    // Fetch the user.
    new User({
      emailAddress: emailAddress
    }).fetch().then(function (user) {

      // Set the password using the key.
      return user.set({
        'password': password,
        'passwordResetKey': passwordResetKey
      }).save();

    }).then(function () {
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

  after(function () {
    new User({
      emailAddress: emailAddress
    }).fetch().then(function (user) {
      user.destroy();
    });
  });
});
