var GeneralBiz = require('./general');
var User = require('../models/bookshelf').model('User');
var emailer = require('./emailer');
var appUrl = require('../../package.json').appUrl;

var operations = {

  create: {
    beforeCommit: function (trx, authUser, model, body) {
      // TODO Move all validation up from the model?
      var user = new User(body);
      var key = user.generatePasswordResetKey();
      return user.save({
        transacting: trx
      }).tap(function(savedUser){
        var emailMessage = 'Set your password at the following URL: ' + appUrl + '/user/' + savedUser.get('id') + '/setPassword?key=' + key;
        emailer(body.emailAddress, emailMessage);
      });
    },
    afterCommit: function (result) {
      return result.serialize();
    }
  },

  read: {
    beforeCommit: function (trx, authUser, model, body) {},
    afterCommit: function (result) {}
  },

  update: {
    beforeCommit: function (trx, authUser, model, body) {
      if (!authUser && body.passwordResetKey && body.password) {
        if (model.verifyPasswordResetKey(body.passwordResetKey)) {
          model.setPassword(body.password);
        }
        return model.set(body).save(null, null, null, {
          transacting: trx
        });
      } else if (authUser.get('id') === model.get('id')) {
        if (body.password) {
          model.setPassword(body.password);
          delete body.password;
        }
        return model.set(body).save(null, null, null, {
          transacting: trx
        });
      } else {
        throw new Error('The authenticated user is not the specified user.');
      }
    },

    afterCommit: function (result) {
      return result.serialize();
    }
  },

  delete: {
    beforeCommit: function (trx, authUser, model, body) {},
    afterCommit: function (result) {}
  }
};

var modelSpecifier = function (idOrEmailAddress) {
  var result;
  if (idOrEmailAddress) {
    if (typeof idOrEmailAddress === 'string') {
      result = new User({
        emailAddress: idOrEmailAddress
      });
    } else {
      result = new User({
        id: idOrEmailAddress
      });
    }
  }
  return result;
};

var UserBiz = GeneralBiz(modelSpecifier, operations);

module.exports = UserBiz;
