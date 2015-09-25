var assert = require('assert');
var Promise = require('bluebird');
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

  it('should be able to update its email address', function (done) {
    var expectedMod = emailAddress + 'a';

    // Fetch the user.
    new User({
      emailAddress: emailAddress
    }).fetch().then(function (user) {

      // Modify the email address.
      return user.set('emailAddress', expectedMod).save();

    }).then(function (user) {
      return new Promise(function (resolve, reject) {

        // What is the email address after the update?
        var actualMod = user.get('emailAddress');

        // Revert to the original email address.
        return user.set('emailAddress', emailAddress)
          .save().then(function () {

            // Pass the modified email address on to the next step.
            resolve(actualMod);
          }, reject);
      });
    }).then(function (actualMod) {

      // Check the modified email address.
      assert.notEqual(actualMod, emailAddress,
        'The email address was not changed.');
      assert.equal(actualMod, expectedMod,
        'The email address was changed incorrectly.');

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

  after(function () {
    new User({
      emailAddress: emailAddress
    }).fetch().then(function (user) {
      user.destroy();
    });
  });
});
