var _ = require('lodash');
var authenticatedTransaction = require('./authenticatedTransaction');
var AuthorisationError = require('../errors/authorisationError');
var NoSuchResourceError = require('../errors/noSuchResourceError');
var MalformedRequestError = require('../errors/malformedRequestError');
var ConflictingEditError = require('../errors/conflictingEditError');
var Checkit = require('checkit');
var escapeForLike = require('./escapeForLike');

var validationRules = new Checkit({
  id: ['required', 'alphaDash', 'minLength:10', 'maxLength:255'],
  title: ['required', 'minLength:1', 'maxLength:255'],
  body: ['required', 'minLength:1', 'maxLength:5000'],
  preview: [],
  author: ['required', 'natural'],
  postedTime: ['required', 'date'],
  active: ['boolean']
});

var searchableParams = [];
var creatableAttributes = ['id', 'title', 'body', 'preview', 'author', 'postedTime', 'active'];

function acceptOnlyAttributes(object, acceptible, errorMessage) {
  for (var attribute in object) {
    if (acceptible.indexOf(attribute) === -1) {
      throw new MalformedRequestError(errorMessage(attribute));
    }
  }
}

module.exports = function (knex) {

  return {

    create: function (args) {
      return authenticatedTransaction(knex, args.auth, function (trx, authUser) {
        var newPost = _.cloneDeep(args.body);
        var absentIdError = new MalformedRequestError('You must supply an id to create a post.');
        var notUniqueIdError = new ConflictingEditError('That id already belongs to another post.');

        acceptOnlyAttributes(newPost, creatableAttributes, function (attribute) {
          return 'The attribute ' + attribute + ' cannot be written during a post creation.';
        });

        // Convert postedTime to a Date and ensure that it's valid.
        newPost.postedTime = new Date(newPost.postedTime);
        if (isNaN(newPost.postedTime.getTime())) {
          throw new MalformedRequestError('postedTime must be a dateTime.');
        }

        return validationRules.run(newPost)
          .then(function () {

            // Check for case-insensitive uniqueness of ID.
            return trx
              .from('blogPosts')
              .select(['id'])
              .where('id', 'ilike', escapeForLike(newPost.id));
          }).then(function (existingPosts) {
            if (existingPosts && existingPosts.length) {
              throw notUniqueIdError;
            }

            // Do the insertion.
            return trx
              .into('blogPosts')
              .insert(newPost)
              .returning('id');
          }).then(function (ids) {

            // Respond with an object containing only the ID.
            return {
              id: ids[0]
            };

            // Handle errors.
          }).catch(Checkit.Error, function (err) {
            var message = '';
            for (var attribute in err.errors) {
              message += err.errors[attribute].message + '. ';
            }
            message = message.trim();
            throw new MalformedRequestError(message);
          }).catch(function (err) {
            return err.code === '23502';
          }, function (err) {
            throw absentIdError;
          }).catch(function (err) {
            return err.code === '23505';
          }, function (err) {
            throw notUniqueIdError;
          });

      });
    },

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
            'blogPosts.preview',
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
              preview: post.preview,
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
          query = query.orderBy('postedTime', 'desc');

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
