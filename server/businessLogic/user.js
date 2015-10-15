var generalBiz = require('./general');
var appUrl = require('../../package.json').appUrl;

module.exports = function (bookshelf, emailer, authUser, password) {
  var User = bookshelf.model('User');

  var sendPasswordResetEmail = function (emailAddress, id, key) {
    var emailMessage = 'Set your password at the following URL: ' + appUrl + '/users/' + id + '/setPassword?key=' + key;
    emailer(emailAddress, emailMessage);
  };

  var operations = {

    create: {
      beforeCommit: function (trx, model, body) {
        var user = new User(body);
        var key = user.generatePasswordResetKey();
        return user.save(null, null, null, {
          transacting: trx
        }).tap(function (savedUser) {
          sendPasswordResetEmail(body.emailAddress, savedUser.get('id'), key);
        });
      },
      afterCommit: function (result) {
        return result.serialize();
      }
    },

    read: {
      beforeCommit: function (trx, model) {
        return model;
      },
      afterCommit: function (result) {
        return result.serialize();
      }
    },

    update: {
      beforeCommit: function (trx, model, body) {
        if (body.passwordResetKey && body.password) {
          if (model.verifyPasswordResetKey(body.passwordResetKey)) {
            model.setPassword(body.password);
          }
        } else if (body.passwordResetKey) {
          var key = model.generatePasswordResetKey();
          sendPasswordResetEmail(model.get('emailAddress'), model.get('id'), key);
        } else if (authUser.get('id') === model.get('id')) {
          if (body.password) {
            model.setPassword(body.password);
            delete body.password;
          }
        } else {
          throw new Error('The authenticated user is not the specified user.');
        }
        return model.set(body).save(null, null, null, {
          transacting: trx
        });
      },

      afterCommit: function (result) {
        return result.serialize();
      }
    },

    destroy: {
      beforeCommit: function (trx, model) {
        throw new Error('Deletion of users is not supported. Mark a user inactive instead.');
      },
      afterCommit: function (result) {}
    }
  };

  return function (idOrEmailAddress) {
    function modelSpecifier() {
      var model;
      // TODO This should change to custom URI name rather than email address.
      if (idOrEmailAddress) {
        if (typeof idOrEmailAddress === 'string') {
          model = new User({
            emailAddress: idOrEmailAddress
          });
        } else {
          model = new User({
            id: idOrEmailAddress
          });
        }
      }
      return model;
    }
    return generalBiz(bookshelf, authUser, password, modelSpecifier, operations);
  };
};
