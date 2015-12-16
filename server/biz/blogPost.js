var _ = require('lodash');
var authenticatedTransaction = require('./authenticatedTransaction');
var AuthorisationError = require('../errors/authorisationError');
var NoSuchResourceError = require('../errors/noSuchResourceError');
var MalformedRequestError = require('../errors/malformedRequestError');
var escapeForLike = require('./escapeForLike');

var searchableParams = [];

function acceptOnlyAttributes(object, acceptible, error) {
  for (var attribute in object) {
    if (acceptible.indexOf(attribute) === -1) {
      throw error(attribute);
    }
  }
}

module.exports = function (knex) {

  return {

    read: function (args) {
      return authenticatedTransaction(knex, args.auth, function (trx, authUser) {

        if (args.params && Object.keys(args.params).length && args.query && Object.keys(args.query).length) {
          throw new MalformedRequestError('A read against a specific blog post cannot filter by any other parameters.');
        }

        var query = trx
          .from('blogPosts')
          .leftJoin('users', 'users.id', 'blogPosts.author')
          .select([
            'blogPosts.id',
            'blogPosts.title',
            'blogPosts.postedTime',
            'blogPosts.body',
            'blogPosts.active',
            'users.id as authorId',
            'users.givenName as authorGivenName',
            'users.familyName as authorFamilyName',
            'users.active as authorActive'
          ]);

        function transformAuthor(posts) {
          return _.map(posts, function (post) {
            return {
              id: post.id,
              title: post.title,
              postedTime: post.postedTime,
              body: post.body,
              active: post.active,
              author: {
                id: post.authorId,
                givenName: post.authorGivenName,
                familyName: post.authorFamilyName,
                active: post.authorActive
              }
            };
          });
        }

        if (args.params && args.params.postId) {

          // Read a specific post.
          var post;
          return query
            .where('blogPosts.id', args.params.postId)
            .then(transformAuthor)
            .then(function (posts) {
              if (!posts.length) {
                throw new NoSuchResourceError();
              }
              post = posts[0];
              if (!post.active) {
                throw new AuthorisationError();
              }
              return post;
            });

        } else {

          // Add sorting.
          query = query.orderBy('postedTime', 'asc');

          // Add offset.
          query = query.limit(20);
          if (args.query && args.query.offset) {
            query = query.offset(args.query.offset);
          }

          // Add search parameters.
          var searchParams = _.clone(args.query) || {};
          delete searchParams.offset;
          acceptOnlyAttributes(searchParams, searchableParams, function (attribute) {
            return 'Cannot filter by parameter ' + attribute + '.';
          });
          // TODO Interpret tag, postedTime, and author filters here.
          query = query.where(searchParams);

          // The query is finished.
          return query
            .then(transformAuthor);
        }
      }).then(function (result) {
        return JSON.parse(JSON.stringify(result));
      });
    }

  };
};
