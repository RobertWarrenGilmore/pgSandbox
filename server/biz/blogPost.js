var authenticatedTransaction = require('./authenticatedTransaction');
var AuthorisationError = require('../errors/authorisationError');
var NoSuchResourceError = require('../errors/noSuchResourceError');

module.exports = function (knex) {

  return {

    read: function (args) {
      return authenticatedTransaction(knex, args.auth, function (trx, authUser) {
        var post;
        return trx
          .from('blogPosts')
          .where('id', args.params.postId)
          .select([
            'title',
            'author',
            'postedTime',
            'body',
            'active'
          ]).then(function (posts) {
            if (!posts.length) {
              throw new NoSuchResourceError();
            }
            post = posts[0];
            if (!post.active) {
              throw new AuthorisationError();
            }
            return trx
              .from('users')
              .where('id', post.author)
              .select([
                'id',
                'givenName',
                'familyName',
                'active'
              ]);
          }).then(function (users) {
            if (users.length) {
              post.author = users[0];
            }
            return post;
          });
      }).then(function (result) {
        return JSON.parse(JSON.stringify(result));
      });
    }


  };
};
