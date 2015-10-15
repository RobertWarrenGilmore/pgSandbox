var assert = require('assert');
var sinon = require('sinon');
var appUrl = require('../../../package.json').appUrl;
var mockBookshelf = require('./mockBookshelf');
var Model = mockBookshelf.model('User', ['setPassword', 'verifyPassword', 'verifyPasswordResetKey', 'generatePasswordResetKey']);
var mockEmailer = require('./mockEmailer');
var biz = require('../../../server/businessLogic/biz')(mockBookshelf, mockEmailer);
var AuthenticationError = require('../../../server/businessLogic/authenticationError');

describe('user', function () {
  var emailAddress = 'mocha.test.email.address@not.a.real.domain.com';
  var id = 1;
  var password = 'taco tuesday';
  var passwordResetKey = 'abc123';
  var givenName = 'Victor';
  var familyName = 'Frankenstein';

  beforeEach(function (done) {
    Model.clearInstances();
    Model.reset();
    mockBookshelf.clearTrxs();
    mockEmailer.reset();
    done();
  });

  it('should be able to create', function (done) {
    var expectedUser = {
      id: id,
      emailAddress: emailAddress
    };
    var instance = Model.queueInstances(1)[0];
    instance.generatePasswordResetKey.returns(passwordResetKey);
    instance.get.withArgs('id').returns(id);
    instance.serialize.returns(expectedUser);
    var trx = mockBookshelf.queueTrxs(1)[0];
    var emailMessage = 'Set your password at the following URL: ' + appUrl + '/users/' + id + '/setPassword?key=' + passwordResetKey;

    biz().user().create({
      emailAddress: emailAddress
    }).then(function (user) {

      assert(Model.withArgs({
        emailAddress: emailAddress
      }).calledOnce, 'The model was not instantiated properly.');
      assert(instance.save.withArgs(null, null, null,
        sinon.match({
          transacting: sinon.match.same(trx)
        })
      ).calledOnce, 'The model was not saved properly.');
      assert.deepStrictEqual(user, expectedUser, 'The returned user was wrong.');
      assert(mockEmailer.withArgs(emailAddress, emailMessage).calledOnce, 'The password setting email was not sent properly.');

      done();

    }).catch(function (err) {
      done(err);
    });
  });

  it('should be able to send a password reset email', function (done) {
    var instance = Model.queueInstances(1)[0];
    instance.generatePasswordResetKey.returns(passwordResetKey);
    instance.get.withArgs('emailAddress').returns(emailAddress);
    instance.get.withArgs('id').returns(id);
    var trx = mockBookshelf.queueTrxs(1)[0];
    var emailMessage = 'Set your password at the following URL: ' + appUrl + '/users/' + id + '/setPassword?key=' + passwordResetKey;

    biz().user(id).update({
      passwordResetKey: true
    }).then(function (user) {

      assert(instance.fetch.withArgs(null, null, null,
        sinon.match({
          transacting: sinon.match.same(trx)
        })
      ).calledOnce, 'The model was not fetched properly.');
      assert(instance.generatePasswordResetKey.calledOnce, 'The password reset key was not generated properly.');
      assert(instance.save.withArgs(null, null, null,
        sinon.match({
          transacting: sinon.match.same(trx)
        })
      ).calledOnce, 'The model was not saved properly.');
      assert(mockEmailer.withArgs(emailAddress, emailMessage).calledOnce, 'The password setting email was not sent properly.');

      done();

    }).catch(function (err) {
      done(err);
    });
  });

  it('should be able to set a password', function (done) {
    var expectedUser = {
      id: id,
      emailAddress: emailAddress
    };
    var instance = Model.queueInstances(1)[0];
    instance.verifyPasswordResetKey.withArgs(passwordResetKey).returns(true);
    instance.serialize.returns(expectedUser);
    var trx = mockBookshelf.queueTrxs(1)[0];

    biz().user(id).update({
      password: password,
      passwordResetKey: passwordResetKey
    }).then(function (user) {

      assert(instance.fetch.withArgs(null, null, null,
        sinon.match({
          transacting: sinon.match.same(trx)
        })
      ).calledOnce, 'The model was not fetched properly.');
      assert(instance.verifyPasswordResetKey.withArgs(passwordResetKey).calledOnce, 'The password reset key was not verified properly.');
      assert(instance.setPassword.withArgs(password).calledOnce, 'The password was not set properly.');
      assert(instance.save.withArgs(null, null, null,
        sinon.match({
          transacting: sinon.match.same(trx)
        })
      ).calledOnce, 'The model was not saved properly.');
      assert.deepStrictEqual(user, expectedUser, 'The returned user was wrong.');
      done();

    }).catch(function (err) {
      done(err);
    });
  });

  it('should be able to set an email address', function (done) {
    var mod = emailAddress + 'a';
    var expectedUser = {
      id: id,
      emailAddress: mod
    };
    var instances = Model.queueInstances(2);
    instances[0].verifyPassword.withArgs(password).returns(true);
    instances[1].serialize.returns(expectedUser);
    var trx = mockBookshelf.queueTrxs(1)[0];

    biz(emailAddress, password).user(id).update({
      emailAddress: mod
    }).then(function (user) {

      assert(instances[1].fetch.withArgs(null, null, null,
        sinon.match({
          transacting: sinon.match.same(trx)
        })
      ).calledOnce, 'The model was not fetched properly.');
      assert(instances[1].set.withArgs({
        emailAddress: mod
      }).calledOnce, 'The email address was not set properly.');
      assert(instances[1].save.withArgs().calledOnce, 'The model was not saved properly.');
      assert.deepStrictEqual(user, expectedUser, 'The returned user was wrong.');

      done();
    }).catch(function (err) {
      done(err);
    });
  });

  it('should be able to read', function (done) {
    var expectedUser = {
      id: id,
      emailAddress: emailAddress
    };
    var instance = Model.queueInstances(1)[0];
    instance.serialize.returns(expectedUser);
    var trx = mockBookshelf.queueTrxs(1)[0];

    biz().user(id).read().then(function (user) {

      assert(instance.fetch.withArgs(null, null, null,
        sinon.match({
          transacting: sinon.match.same(trx)
        })
      ).calledOnce, 'The model was not fetched properly.');
      assert.deepStrictEqual(user, expectedUser, 'The returned user was wrong.');
      done();

    }).catch(function (err) {
      done(err);
    });
  });

  it('should fail to delete', function (done) {
    var instance = Model.queueInstances(1)[0];
    instance.verifyPassword.withArgs(password).returns(true);
    biz(emailAddress, password).user(id).destroy().then(function (user) {
      assert.strictEqual(instance.destroy.callCount, 0, 'The model was destroyed.');
      done(new Error('destroy() did not throw.'));
    }).catch(AuthenticationError, function (err) {
      done(err);
    }).catch(function (err) {
      done();
    });
  });

  it('should be able to set inactive', function (done) {
    var expectedUser = {
      id: id,
      emailAddress: emailAddress,
      active: false
    };
    var instances = Model.queueInstances(2);
    instances[0].verifyPassword.withArgs(password).returns(true);
    instances[1].serialize.returns(expectedUser);
    var trx = mockBookshelf.queueTrxs(1)[0];

    biz(emailAddress, password).user(id).update({
      active: false
    }).then(function (user) {

      assert(instances[1].fetch.withArgs(null, null, null,
        sinon.match({
          transacting: sinon.match.same(trx)
        })
      ).calledOnce, 'The model was not fetched properly.');
      assert(instances[1].set.withArgs({
        active: false
      }).calledOnce, 'The property was not set properly.');
      assert(instances[1].save.withArgs().calledOnce, 'The model was not saved properly.');
      assert.deepStrictEqual(user, expectedUser, 'The returned user was wrong.');

      done();
    }).catch(function (err) {
      done(err);
    });
  });

  it('should be able to set active', function (done) {
    var expectedUser = {
      id: id,
      emailAddress: emailAddress,
      active: true
    };
    var instances = Model.queueInstances(2);
    instances[0].verifyPassword.withArgs(password).returns(true);
    instances[1].serialize.returns(expectedUser);
    var trx = mockBookshelf.queueTrxs(1)[0];

    biz(emailAddress, password).user(id).update({
      active: true
    }).then(function (user) {

      assert(instances[1].fetch.withArgs(null, null, null,
        sinon.match({
          transacting: sinon.match.same(trx)
        })
      ).calledOnce, 'The model was not fetched properly.');
      assert(instances[1].set.withArgs({
        active: true
      }).calledOnce, 'The property was not set properly.');
      assert(instances[1].save.withArgs().calledOnce, 'The model was not saved properly.');
      assert.deepStrictEqual(user, expectedUser, 'The returned user was wrong.');

      done();
    }).catch(function (err) {
      done(err);
    });
  });

  it('should fail to set inactive while authenticated as someone else', function (done) {
    var instances = Model.queueInstances(2);
    instances[0].get.withArgs('id').returns(id);
    instances[0].verifyPassword.withArgs(password).returns(true);
    instances[1].get.withArgs('id').returns(id + 1); // different id, different user

    biz(emailAddress, password).user(id).update({
      active: false
    }).then(function (user) {
      done(new Error('Updating another user succeeded.'));
    }).catch(AuthenticationError, function (err) {
      done(err);
    }).catch(function (err) {
      done();
    });
  });

  it('should be able to set a given name and family name', function (done) {
    var expectedUser = {
      id: id,
      emailAddress: emailAddress,
      givenName: givenName,
      familyName: familyName,
      active: true
    };
    var instances = Model.queueInstances(2);
    instances[0].verifyPassword.withArgs(password).returns(true);
    instances[1].serialize.returns(expectedUser);
    var trx = mockBookshelf.queueTrxs(1)[0];

    biz(emailAddress, password).user(id).update({
      givenName: givenName,
      familyName: familyName
    }).then(function (user) {

      assert(instances[1].fetch.withArgs(null, null, null,
        sinon.match({
          transacting: sinon.match.same(trx)
        })
      ).calledOnce, 'The model was not fetched properly.');
      assert(instances[1].set.withArgs({
        givenName: givenName,
        familyName: familyName
      }).calledOnce, 'The property was not set properly.');
      assert(instances[1].save.withArgs().calledOnce, 'The model was not saved properly.');
      assert.deepStrictEqual(user, expectedUser, 'The returned user was wrong.');

      done();
    }).catch(function (err) {
      done(err);
    });
  });

  it('should be able to list all users');
  it('should be able to search by family name');
  it('should be able to search by family name and given name');

  context('when the model fails to set an attribute', function () {

    it('should fail to set a password', function (done) {
      function MyCustomError() {}
      MyCustomError.prototype = Object.create(Error.prototype);

      var instance = Model.queueInstances(1)[0];
      instance.verifyPasswordResetKey.withArgs(passwordResetKey).returns(true);
      instance.set.throws(new MyCustomError());

      biz().user(id).update({
        password: password,
        passwordResetKey: passwordResetKey
      }).then(function (user) {
        assert(false, 'The creation succeeded.');
      }).catch(MyCustomError, function (err) {
        done();
      }).catch(function (err) {
        done(err);
      });
    });

    it('should fail to set an email address', function (done) {
      function MyCustomError() {}
      MyCustomError.prototype = Object.create(Error.prototype);

      var mod = emailAddress + 'a';
      var instances = Model.queueInstances(2);
      instances[0].verifyPassword.withArgs(password).returns(true);
      instances[1].set.throws(new MyCustomError());

      biz(emailAddress, password).user(id).update({
        emailAddress: mod
      }).then(function (user) {
        assert(false, 'The creation succeeded.');
      }).catch(MyCustomError, function (err) {
        done();
      }).catch(function (err) {
        done(err);
      });
    });

  });

  context('when the model fails to save', function () {

    it('should fail to create', function (done) {
      function MyCustomError() {}
      MyCustomError.prototype = Object.create(Error.prototype);

      var instance = Model.queueInstances(1)[0];
      instance.generatePasswordResetKey.returns(passwordResetKey);
      instance.save.throws(new MyCustomError());
      instance.get.withArgs('id').returns(id);

      biz().user().create({
        emailAddress: emailAddress
      }).then(function (user) {
        assert(false, 'The creation succeeded.');
      }).catch(MyCustomError, function (err) {
        done();
      }).catch(function (err) {
        done(err);
      });
    });

    it('should fail to send a password reset email', function (done) {
      function MyCustomError() {}
      MyCustomError.prototype = Object.create(Error.prototype);

      var instance = Model.queueInstances(1)[0];
      instance.generatePasswordResetKey.returns(passwordResetKey);
      instance.save.throws(new MyCustomError());
      instance.get.withArgs('emailAddress').returns(emailAddress);
      instance.get.withArgs('id').returns(id);

      biz().user(id).update({
        passwordResetKey: true
      }).then(function (user) {
        assert(false, 'The creation succeeded.');
      }).catch(MyCustomError, function (err) {
        done();
      }).catch(function (err) {
        done(err);
      });
    });

    it('should fail to set a password', function (done) {
      function MyCustomError() {}
      MyCustomError.prototype = Object.create(Error.prototype);

      var instance = Model.queueInstances(1)[0];
      instance.verifyPasswordResetKey.withArgs(passwordResetKey).returns(true);
      instance.save.throws(new MyCustomError());

      biz().user(id).update({
        password: password,
        passwordResetKey: passwordResetKey
      }).then(function (user) {
        assert(false, 'The creation succeeded.');
      }).catch(MyCustomError, function (err) {
        done();
      }).catch(function (err) {
        done(err);
      });
    });

    it('should fail to set an email address', function (done) {
      function MyCustomError() {}
      MyCustomError.prototype = Object.create(Error.prototype);

      var mod = emailAddress + 'a';
      var instances = Model.queueInstances(2);
      instances[0].verifyPassword.withArgs(password).returns(true);
      instances[1].save.throws(new MyCustomError());

      biz(emailAddress, password).user(id).update({
        emailAddress: mod
      }).then(function (user) {
        assert(false, 'The creation succeeded.');
      }).catch(MyCustomError, function (err) {
        done();
      }).catch(function (err) {
        done(err);
      });
    });

  });
  context('when the model fails another operation', function () {
    it('should fail to verify a wrong password reset key');
    it('should fail to authenticate with an improperly formatted email address');
    it('should fail to authenticate with an unassigned email address');

    it('should fail to authenticate with a wrong password', function (done) {
      var instance = Model.queueInstances(1)[0];
      instance.verifyPassword.withArgs(password).returns(false);
      instance.get.withArgs('id').returns(id);

      biz(emailAddress, password).user(id).read().then(function (user) {
        assert(false, 'Authentication did not fail.');
      }).catch(AuthenticationError, function () {
        done();
      }).catch(function (err) {
        done(err);
      });
    });
    
    it('should fail to set an email address on a non-existent user');
  });

  context('when the emailer fails', function () {
    function MyCustomError() {}
    MyCustomError.prototype = Object.create(Error.prototype);

    beforeEach(function (done) {
      mockEmailer.throws(new MyCustomError());
      done();
    });

    it('should fail to create', function (done) {
      var instance = Model.queueInstances(1)[0];
      instance.generatePasswordResetKey.returns(passwordResetKey);
      instance.get.withArgs('id').returns(id);

      biz().user().create({
        emailAddress: emailAddress
      }).then(function (user) {
        assert(!mockEmailer.called, 'The password setting email was sent.');
        throw new Error('The creation did not fail.');
      }).catch(MyCustomError, function () {
        done();
      }).catch(function (err) {
        done(err);
      });
    });

    it('should fail to send a password reset email', function (done) {
      var instance = Model.queueInstances(1)[0];
      instance.generatePasswordResetKey.returns(passwordResetKey);
      instance.get.withArgs('emailAddress').returns(emailAddress);
      instance.get.withArgs('id').returns(id);

      biz().user(id).update({
        passwordResetKey: true
      }).then(function (user) {
        assert(false, 'The email was sent.');
      }).catch(AuthenticationError, function (err) {
        done(err);
      }).catch(function (err) {
        done();
      });
    });

  });

});
