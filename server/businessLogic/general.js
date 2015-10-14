var Promise = require('bluebird');
var Bookshelf = require('../models/bookshelf');

var GeneralBiz = function (authUser, password, modelSpecifier, operations) {
  this._authUser = authUser;
  this._password = password;
  this._operations = operations;
  this._specifiedModel = null;
  if (typeof modelSpecifier === 'function') {
    return function () {
      this._specifiedModel = modelSpecifier.apply(this, arguments);
      return this;
    }.bind(this);
  } else {
    return this;
  }
};

GeneralBiz.prototype._doTransaction = function (operations, body) {
  var authUser = this._authUser;
  var password = this._password;
  var specifiedModel = this._specifiedModel;
  return Bookshelf.transaction(function (trx) {
    var promiseProps = {};
    if (authUser) {
      promiseProps.authUser = authUser.fetch(null, null, null, {
        transacting: trx
      }).then(function (user) {
        var authenticated = user.verifyPassword(password);
        if (!authenticated) {
          return user;
        } else {
          throw new Error('Authentication failed.');
        }
      });
    }
    if (specifiedModel) {
      promiseProps.specifiedModel = specifiedModel.fetch(null, null, null, {
        transacting: trx
      });
    }
    return Promise.props(promiseProps).then(function (props) {
      return operations.beforeCommit(trx, props.authUser, props.specifiedModel, body);
    });
  }).then(function (result) {
    return operations.afterCommit(result);
  });

};

GeneralBiz.prototype.create = function (body) {
  return this._doTransaction(this._operations.create, body);
};

GeneralBiz.prototype.read = function (body) {
  return this._doTransaction(this._operations.read, body);
};

GeneralBiz.prototype.update = function (body) {
  return this._doTransaction(this._operations.update, body);
};

GeneralBiz.prototype.destroy = function (body) {
  return this._doTransaction(this._operations.destroy, body);
};

var newSubClass = function (modelSpecifier, operations) {
  var Clazz = function (authUser, password) {
    return GeneralBiz.call(this, authUser, password, modelSpecifier, operations);
  };
  Clazz.prototype = Object.create(GeneralBiz.prototype);
  Clazz.prototype.constructor = Clazz;
  return Clazz;
}

module.exports = newSubClass;
