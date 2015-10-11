var User = require('../models/bookshelf').model('User');
var UserBiz = require('./user');

var BizModules = function (authenticatedUser) {
  this.user = new UserBiz(authenticatedUser);
};

var authenticator = {
  anonymous: new BizModules(),
  authenticate: function (emailAddress, password) {
    var authenticatedUser = new User({
      emailAddress: emailAddress
    }).fetch().then(
      function (user) {
        var authenticated = user.verifyPassword(password);
        if (authenticated) {
          return user;
        } else {
          throw new Error('Authentication failed.');
        }
      },
      function (err) {
        throw err;
      }
    );
    return new BizModules(authenticatedUser);
  }

};

module.exports = authenticator;
