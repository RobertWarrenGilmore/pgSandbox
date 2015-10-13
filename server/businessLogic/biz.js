var Bookshelf = require('../models/bookshelf');
var User = Bookshelf.model('User');
var UserBiz = require('./user');

var BizModules = function (authUser, password) {
  this.user = new UserBiz(authUser, password);
};

var authenticator = {

  anonymous: new BizModules(),

  authenticate: function (emailAddress, password) {
    return new BizModules(new User({
      emailAddress: emailAddress
    }), password);
  }

};

module.exports = authenticator;
