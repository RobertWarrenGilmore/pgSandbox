var Promise = require('bluebird');
var AuthenticationError = require('./authenticationError');

function generalBiz(bookshelf, authUser, password, modelSpecifier, operations) {
  var methods = {};
  Object.keys(operations).map(function (key) {
    methods[key] =
      function () {
        var beforeArgs = Array.prototype.slice.call(arguments);
        return bookshelf.transaction(function (trx) {
          var promiseProps = {};
          if (authUser) {
            promiseProps.authUser = authUser.fetch(null, null, null, {
              transacting: trx
            }).then(function (user) {
              var authenticated = user.verifyPassword(password);
              if (!authenticated) {
                throw new AuthenticationError();
              }
              return user;
            });
          }
          var specifiedModel = modelSpecifier();
          if (specifiedModel) {
            promiseProps.specifiedModel = specifiedModel.fetch(null, null, null, {
              transacting: trx
            });
          }
          return Promise.props(promiseProps).then(function (props) {
            var args = [trx, props.specifiedModel].concat(beforeArgs);
            return operations[key].beforeCommit.apply(null, args);
          });
        }).then(function (result) {
          return operations[key].afterCommit(result);
        });

      };
  });
  return methods;
};

module.exports = generalBiz;
