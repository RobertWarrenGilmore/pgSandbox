var UserModel = require('../models/bookshelf').model('User');

var BizModules = function () {
};

//BizModules.prototype.user = userBiz;

var authenticator = {
  anonymous: new BizModules(),
  authenticate: function (emailAddress, password) {
    var bizModules = new BizModules();
    new UserModel({
      emailAddress: emailAddress
    }).fetch().then(function (user) {
      var authenticated = user.verifyPassword(password);
      if (authenticated) {
        bizModules.setAuthenticatedUser(user);
      } else {
        throw new Error('Authentication failed.');
      }
    }).catch(function (err) {
      throw err;
    });
    return bizModules;
  }

};

module.exports = authenticator;
