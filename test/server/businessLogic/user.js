var assert = require('assert');
var sinon = require('sinon');
var appUrl = require('../../../package.json').appUrl;

describe('user', function () {

  context('unit', function () {
    var mockBookshelf = require('./mockBookshelf');
    var Model = mockBookshelf.model('User', ['setPassword', 'verifyPassword', 'verifyPasswordResetKey', 'generatePasswordResetKey']);
    var Collection = mockBookshelf.Collection;
    var mockEmailer = require('./mockEmailer');
    var biz = require('../../../server/businessLogic/biz')(mockBookshelf, mockEmailer);
    var AuthenticationError = require('../../../server/businessLogic/authenticationError');

    var emailAddress = 'mocha.test.email.address@not.a.real.domain.com';
    var id = 1;
    var password = 'taco tuesday';
    var passwordResetKey = 'abc123';
    var givenName = 'Victor';
    var familyName = 'Frankenstein';

    beforeEach(function () {
      Model.clearInstances();
      Model.reset();
      mockBookshelf.clearTrxs();
      mockEmailer.reset();
    });

    it('should be able to create', function () {
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

      return biz().user().create({
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
      });
    });

    it('should be able to send a password reset email', function () {
      var instance = Model.queueInstances(1)[0];
      instance.generatePasswordResetKey.returns(passwordResetKey);
      instance.get.withArgs('emailAddress').returns(emailAddress);
      instance.get.withArgs('id').returns(id);
      var trx = mockBookshelf.queueTrxs(1)[0];
      var emailMessage = 'Set your password at the following URL: ' + appUrl + '/users/' + id + '/setPassword?key=' + passwordResetKey;

      return biz().user(id).update({
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
      });
    });

    it('should be able to set a password while authenticated');
    it('should fail to set a password while authenticated as someone else');
    it('should fail to set a property that users do not have');

    it('should be able to set a password anonymously with a key', function () {
      var expectedUser = {
        id: id,
        emailAddress: emailAddress
      };
      var instance = Model.queueInstances(1)[0];
      instance.verifyPasswordResetKey.withArgs(passwordResetKey).returns(true);
      instance.serialize.returns(expectedUser);
      var trx = mockBookshelf.queueTrxs(1)[0];

      return biz().user(id).update({
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
      });
    });

    it('should be able to set an email address', function () {
      var mod = emailAddress + 'a';
      var expectedUser = {
        id: id,
        emailAddress: mod
      };
      var instances = Model.queueInstances(2);
      instances[0].verifyPassword.withArgs(password).returns(true);
      instances[1].serialize.returns(expectedUser);
      var trx = mockBookshelf.queueTrxs(1)[0];

      return biz(emailAddress, password).user(id).update({
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
      });
    });

    it('should be able to read', function () {
      var expectedUser = {
        id: id,
        emailAddress: emailAddress
      };
      var instance = Model.queueInstances(1)[0];
      instance.serialize.returns(expectedUser);
      var trx = mockBookshelf.queueTrxs(1)[0];

      return biz().user(id).read().then(function (user) {

        assert(instance.fetch.withArgs(null, null, null,
          sinon.match({
            transacting: sinon.match.same(trx)
          })
        ).calledOnce, 'The model was not fetched properly.');
        assert.deepStrictEqual(user, expectedUser, 'The returned user was wrong.');
      });
    });

    it('should be able to set inactive', function () {
      var expectedUser = {
        id: id,
        emailAddress: emailAddress,
        active: false
      };
      var instances = Model.queueInstances(2);
      instances[0].verifyPassword.withArgs(password).returns(true);
      instances[1].serialize.returns(expectedUser);
      var trx = mockBookshelf.queueTrxs(1)[0];

      return biz(emailAddress, password).user(id).update({
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
      });
    });

    it('should be able to set active', function () {
      var expectedUser = {
        id: id,
        emailAddress: emailAddress,
        active: true
      };
      var instances = Model.queueInstances(2);
      instances[0].verifyPassword.withArgs(password).returns(true);
      instances[1].serialize.returns(expectedUser);
      var trx = mockBookshelf.queueTrxs(1)[0];

      return biz(emailAddress, password).user(id).update({
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
        assert(false, 'Updating another user succeeded.');
      }).catch(AuthenticationError, function (err) {
        done(err);
      }).catch(function (err) {
        done();
      });
    });

    it('should be able to set a given name and family name', function () {
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

      return biz(emailAddress, password).user(id).update({
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
      });
    });

    it('should be able to list all users', function () {
      var collection = Collection.queueInstances(1)[0];
      var expectedUsers = [{
        id: 0
      }, {
        id: 1
      }, {
        id: 2
      }];
      collection.serialize.returns(expectedUsers);
      var query = {
        orderBy: ['familyName', 'asc']
      };
      var qModel = new Model();
      Model.query.withArgs(query).returns(qModel);

      return biz().user().read(query).then(function (users) {
        assert(Model.query.withArgs(query).calledOnce, 'The query was not made.');
        assert(qModel.fetch.calledOnce, 'The models were not fetched.');
        assert(collection.serialize.calledOnce, 'The collection was not serialized.');
        assert.deepStrictEqual(users, expectedUsers, 'The returned user list was wrong.');
      });
    });

    it('should be fail to search with a malformed query');
    it('should be fail to search with a malformed query');
    it('should be able to search by family name');
    it('should be able to search by family name and given name');

    context('when the model fails to set an attribute', function () {

      it('should fail to set a password', function () {
        function MyCustomError() {}
        MyCustomError.prototype = Object.create(Error.prototype);

        var instance = Model.queueInstances(1)[0];
        instance.verifyPasswordResetKey.withArgs(passwordResetKey).returns(true);
        instance.set.throws(new MyCustomError());

        return biz().user(id).update({
          password: password,
          passwordResetKey: passwordResetKey
        }).then(function (user) {
          assert(false, 'The creation succeeded.');
        }).catch(MyCustomError);
      });

      it('should fail to set an email address', function () {
        function MyCustomError() {}
        MyCustomError.prototype = Object.create(Error.prototype);

        var mod = emailAddress + 'a';
        var instances = Model.queueInstances(2);
        instances[0].verifyPassword.withArgs(password).returns(true);
        instances[1].set.throws(new MyCustomError());

        return biz(emailAddress, password).user(id).update({
          emailAddress: mod
        }).then(function (user) {
          assert(false, 'The creation succeeded.');
        }).catch(MyCustomError);
      });

    });

    context('when the model fails to save', function () {

      it('should fail to create', function () {
        function MyCustomError() {}
        MyCustomError.prototype = Object.create(Error.prototype);

        var instance = Model.queueInstances(1)[0];
        instance.generatePasswordResetKey.returns(passwordResetKey);
        instance.save.throws(new MyCustomError());
        instance.get.withArgs('id').returns(id);

        return biz().user().create({
          emailAddress: emailAddress
        }).then(function (user) {
          assert(false, 'The creation succeeded.');
        }).catch(MyCustomError);
      });

      it('should fail to send a password reset email', function () {
        function MyCustomError() {}
        MyCustomError.prototype = Object.create(Error.prototype);

        var instance = Model.queueInstances(1)[0];
        instance.generatePasswordResetKey.returns(passwordResetKey);
        instance.save.throws(new MyCustomError());
        instance.get.withArgs('emailAddress').returns(emailAddress);
        instance.get.withArgs('id').returns(id);

        return biz().user(id).update({
          passwordResetKey: true
        }).then(function (user) {
          assert(false, 'The creation succeeded.');
        }).catch(MyCustomError);
      });

      it('should fail to set a password', function () {
        function MyCustomError() {}
        MyCustomError.prototype = Object.create(Error.prototype);

        var instance = Model.queueInstances(1)[0];
        instance.verifyPasswordResetKey.withArgs(passwordResetKey).returns(true);
        instance.save.throws(new MyCustomError());

        return biz().user(id).update({
          password: password,
          passwordResetKey: passwordResetKey
        }).then(function (user) {
          assert(false, 'The creation succeeded.');
        }).catch(MyCustomError);
      });

      it('should fail to set an email address', function () {
        function MyCustomError() {}
        MyCustomError.prototype = Object.create(Error.prototype);

        var mod = emailAddress + 'a';
        var instances = Model.queueInstances(2);
        instances[0].verifyPassword.withArgs(password).returns(true);
        instances[1].save.throws(new MyCustomError());

        return biz(emailAddress, password).user(id).update({
          emailAddress: mod
        }).then(function (user) {
          assert(false, 'The creation succeeded.');
        }).catch(MyCustomError);
      });

    });

    context('when authentication fails', function () {

      it('should fail to set a password with an incorrect key', function () {
        var instance = Model.queueInstances(1)[0];
        instance.verifyPasswordResetKey.withArgs(passwordResetKey).returns(false);
        instance.get.withArgs('id').returns(id);

        return biz().user(id).update({
          password: password,
          passwordResetKey: passwordResetKey
        }).then(function (user) {
          assert(instance.verifyPasswordResetKey.withArgs(passwordResetKey).called, 'The key was not verified.');
          assert(false, 'The password was set.');
        }).catch(AuthenticationError, function () {
          assert(instance.verifyPasswordResetKey.withArgs(passwordResetKey).called, 'The key was not verified.');
        });
      });

      it('should fail to authenticate with an unassigned email address', function () {
        var instance = Model.queueInstances(2)[0];
        instance.fetch.returns(Promise.resolve(null));
        instance.verifyPassword.withArgs(password).returns(true);
        instance.get.withArgs('id').returns(id);

        return biz(emailAddress, password).user(id).read().then(function () {
          assert(false, 'Authentication succeeded.');
        }).catch(AuthenticationError);
      });

      it('should fail to authenticate with a wrong password', function () {
        var instance = Model.queueInstances(1)[0];
        instance.verifyPassword.withArgs(password).returns(false);
        instance.get.withArgs('id').returns(id);

        return biz(emailAddress, password).user(id).read().then(function (user) {
          assert(false, 'Authentication succeeded.');
        }).catch(AuthenticationError);
      });

      it('should fail to set an email address on a non-existent user', function () {
        var instance = Model.queueInstances(2)[0];
        instance.fetch.returns(Promise.resolve(null));
        instance.verifyPassword.withArgs(password).returns(true);
        instance.get.withArgs('id').returns(id);

        return biz(emailAddress, password).user(id).update({
          emailAddress: emailAddress
        }).then(function () {
          assert(false, 'The email address was set.');
        }).catch(AuthenticationError);
      });

    });

    context('when the emailer fails', function () {
      function MyCustomError() {}
      MyCustomError.prototype = Object.create(Error.prototype);

      beforeEach(function () {
        mockEmailer.throws(new MyCustomError());
      });

      it('should fail to create', function () {
        var instance = Model.queueInstances(1)[0];
        instance.generatePasswordResetKey.returns(passwordResetKey);
        instance.get.withArgs('id').returns(id);

        return biz().user().create({
          emailAddress: emailAddress
        }).then(function (user) {
          assert(!mockEmailer.called, 'The password setting email was sent.');
          throw new Error('The creation did not fail.');
        }).catch(MyCustomError);
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

  context('integrated', function () {
    it('tests needed');
  });

});
