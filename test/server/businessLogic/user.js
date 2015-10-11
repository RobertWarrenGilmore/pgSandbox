var assert = require('assert');
var mockBookshelf = require('./mockBookshelf');
var Model = mockBookshelf.model('User', ['setPassword', 'verifyPassword', 'generatePassword', 'verifyPasswordResetKey']);
var proxyquire = require('proxyquire');
var UserBiz = proxyquire('../../../server/businessLogic/user', {
  '../models/bookshelf': mockBookshelf
});
var biz = proxyquire('../../../server/businessLogic/biz', {
  '../models/bookshelf': mockBookshelf,
  './user': UserBiz
});

describe('user', function () {
  var emailAddress = 'mocha.test.email.address@not.a.real.domain.com';
  var id = 1;
  var password = 'taco tuesday';
  var passwordResetKey = 'abc123';

  beforeEach(function (done) {
    Model.clearInstances();
    Model.reset();
    done();
  });

  it('should be able to create', function (done) {
    var expectedJson = '{"id":' + id + ',"emailAddress":"' + emailAddress + '"}';
    var instance = Model.queueInstances(1)[0];
    instance.serialize.returns(expectedJson);

    biz.anonymous.user().create({
      // TODO Find a way to remove the () from after user.
      emailAddress: emailAddress
    }).then(
      function (user) {

        assert(Model.withArgs({
          emailAddress: emailAddress
        }).calledOnce, 'The model was not instantiated properly.');
        assert(instance.save.withArgs().calledOnce, 'The model was not saved properly.');
        assert.deepStrictEqual(user, expectedJson, 'The returned User JSON was wrong.');

        // TODO Test that the password reset key email was sent.
        assert(false, 'The test does not yet test for the sending of the password reset key email.');

        done();

      },
      function (err) {
        done(err);
      }
    ).catch(function (err) {
      done(err);
    });
  });

  it('should be able to generate a password reset key');
  it('should be able to verify a password reset key');

  it('should be able to set a password', function (done) {
    var expectedJson = '{"id":' + id + ',"emailAddress":"' + emailAddress + '"}';
    var instance = Model.queueInstances(1)[0];
    instance.verifyPasswordResetKey.returns(true);
    instance.serialize.returns(expectedJson);

    biz.anonymous.user(1).update({
      password: password,
      passwordResetKey: passwordResetKey
    }).then(
      function (user) {

        assert(instance.fetch.calledOnce, 'The model was not fetched properly.');
        assert(instance.verifyPasswordResetKey.withArgs(passwordResetKey).calledOnce, 'The password reset key was not verified properly.');
        assert(instance.setPassword.withArgs(password).calledOnce, 'The password was not set properly.');
        assert(Model.instances[0].save.withArgs().calledOnce, 'The model was not saved properly.');
        assert.deepStrictEqual(user, expectedJson, 'The returned User JSON was wrong.');
        done();

      },
      function (err) {
        done(err);
      }
    ).catch(function (err) {
      done(err);
    });
  });

  it('should be able to set an email address', function (done) {
    var mod = emailAddress + 'a';
    var expectedJson = '{"emailAddress":"' + mod + '"}';
    var instance = Model.queueInstances(1)[0];
    instance.serialize.returns(expectedJson);
    // TODO separate instance for auth?

    biz.authenticate(emailAddress, password).user(1).update({
      emailAddress: mod
    }).then(
      function (user) {

        assert(instance.fetch.calledOnce, 'The model was not fetched properly.');
        assert(instance.set.withArgs({
          emailAddress: mod
        }).calledOnce, 'The email address was not set properly.');
        assert(Model.instances[0].save.withArgs().calledOnce, 'The model was not saved properly.');
        assert.deepStrictEqual(user, expectedJson, 'The returned User JSON was wrong.');

        done();
      },
      function (err) {
        done(err);
      }
    ).catch(function (err) {
      done(err);
    });

  });

  context('when the model fails to set an attribute', function () {
    it('should fail to create');
    it('should fail to set a password');
    it('should fail to set an email address');
  });
  context('when the model fails to save', function () {
    it('should fail to create');
    it('should fail to generate a password reset key');
    it('should fail to set a password');
    it('should fail to set an email address');
  });
  context('when the model fails another operation', function () {
    it('should fail to verify a wrong password');
    it('should fail to verify a wrong password reset key');
    it('should fail to authenticate with a bad email address');
    it('should fail to set an email address on a non-existent user');
  });
  context('when the emailer fails', function () {
    it('should fail to create');
    it('should fail to generate a password reset key');
  });

});
