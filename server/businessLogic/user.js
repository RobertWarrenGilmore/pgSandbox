var Promise = require('bluebird');
var User = require('../models/bookshelf').model('User');

var UserBiz = function (authenticatedUser) {
  this._authenticatedUser = authenticatedUser;
  var self = this;
  return function (idOrEmailAddress) {
    if (idOrEmailAddress) {
      if (typeof idOrEmailAddress === 'string') {
        self._specifiedUser = new User({
          emailAddress: idOrEmailAddress
        }).fetch();
      } else {
        self._specifiedUser = new User({
          id: idOrEmailAddress
        }).fetch();
      }
    }
    return self;
  };
};

UserBiz.prototype.create = function (options) {
  // TODO Move all verification up from the model.
  return new User(options).save().then(function (user) {
    return user.serialize();
  });
};

UserBiz.prototype.update = function () {
  return new Promise(function (resolve, reject) {
    resolve();
  });
};

UserBiz.prototype.generatePasswordResetKey = function () {
  return new Promise(function (resolve, reject) {
    resolve();
  });
};

module.exports = UserBiz;
