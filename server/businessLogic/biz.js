var userBiz = require('./user');

module.exports = function (bookshelf, emailer) {

  return function authenticate(emailAddress, password) {
    var authUser;
    if (emailAddress) {
      var User = bookshelf.model('User');
      authUser = new User({
        emailAddress: emailAddress
      });
    }

    return {
      user: userBiz(bookshelf, emailer, authUser, password)
    };

  };

};
