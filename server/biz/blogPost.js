var _ = require('lodash');
var AuthorisationError = require('../errors/authorisationError');
var NoSuchResourceError = require('../errors/noSuchResourceError');
var MalformedRequestError = require('../errors/malformedRequestError');
var ConflictingEditError = require('../errors/conflictingEditError');
var Checkit = require('checkit');
var escapeForLike = require('./utilities/escapeForLike');
var authenticatedTransaction = require('./utilities/authenticatedTransaction');
var acceptOnlyAttributes = require('./utilities/acceptOnlyAttributes');
var validateAndTransform = require('./utilities/validateAndTransform');


module.exports = function (knex) {

  return {

    create: function (args) {
      return authenticatedTransaction(knex, args.auth, function (trx, authUser) {
        if (!authUser) {
          throw new AuthorisationError('Blog posts cannot be created anonymously');
        }
        if (!authUser.authorisedToBlog) {
          throw new AuthorisationError('You are not authorised to create blog posts');
        }

        var absentIdError = new MalformedRequestError('You must supply an id to create a post');
        var notUniqueIdError = new ConflictingEditError('That id already belongs to another post');
        var noSuchAuthorError = new ConflictingEditError('The given author does not exist');

        return validateAndTransform(args.body, {

          acceptableAttributes: [
            'id',
            'title',
            'body',
            'preview',
            'author',
            'postedTime',
            'active'
          ],

          checkIt: new Checkit({
            id: [
              {
                rule: 'required',
                message: 'The id is required'
              }, {
                rule: 'alphaDash',
                message: 'The id must consist of letters, numbers, dashes, and underscores'
              }, {
                rule: 'minLength:10',
                message: 'The id must be at least 10 characters long'
              }, {
                rule: 'maxLength:255',
                message: 'The id must be at most 255 characters long'
              }, function (val) {
                // Check for case-insensitive uniqueness of ID.
                return trx
                  .from('blogPosts')
                  .select(['id'])
                  .where('id', 'ilike', escapeForLike(val))
                  .then(function (existingPosts) {
                    if (existingPosts && existingPosts.length) {
                      throw notUniqueIdError;
                    }
                  });
              }, function (val) {
                // Check that the ID starts with an ISO date.
                if (!val.substring(0, 10).match(/^\d\d\d\d\-\d\d\-\d\d$/)
                  || isNaN(new Date(val.substring(0, 10)).getTime())) {
                  throw new MalformedRequestError('The id must begin with a date in the format yyyy-mm-dd');
                }
              }
            ],
            title: [
              {
                rule: 'required',
                message: 'The title is required'
              }, {
                rule: 'minLength:1',
                message: 'The title must be at least 1 character long'
              }, {
                rule: 'maxLength:255',
                message: 'The title must be at most 255 characters long'
              }
            ],
            body: ['required', 'maxLength:5000'],
            preview: ['maxLength:5000'],
            author: [
              {
                rule: 'required',
                message: 'The id is required'
              }, function (val) {
                acceptOnlyAttributes(val, ['id'], function (attribute) {
                  return 'The attribute author.' + attribute + ' cannot be written during a post creation';
                });
              }, function (val) {
                if (!val.id) {
                  throw new MalformedRequestError('The id of the author is required');
                }
              }, function (val) {
                // Check for existence of the author.
                return trx
                  .from('users')
                  .select(['id'])
                  .where('id', val.id)
                  .then(function (users) {
                    if (!users || !users.length) {
                      throw noSuchAuthorError;
                    }
                  });
              }, function (val) {
                // Check that the author is the authenticated user.
                if (val.id !== authUser.id) {
                  throw new AuthorisationError('You cannot create a post that belongs to someone else');
                }
              }
            ],
            postedTime: [
              {
                rule: 'required',
                message: 'The postedTime is required'
              }, function (val) {
                if (isNaN(new Date(val).getTime())) {
                  throw new MalformedRequestError('postedTime must be a dateTime');
                }
              }
            ],
            active: ['boolean']
          }),

          transform: function (old) {
            return {
              id: old.id,
              title: old.title,
              body: old.body,
              preview: old.preview,
              postedTime: new Date(old.postedTime),
              author: old.author.id
            };
          }
        }).then(function (newPost) {

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
            message = attribute + '\n';
            var attrErrs = err.errors[attribute].errors;
            for (var i in attrErrs) {
              var specificErr = attrErrs[i];
              // If we have anything other than a ValidationError or a MalformedRequestError, throw it and forget about the rest.
              if (!(specificErr instanceof Checkit.ValidationError)
                && !(specificErr instanceof MalformedRequestError)) {
                throw specificErr;
              }
              message += '  ' + specificErr.message + '\n';
            }
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
        }).catch(function (err) {
          return err.code === '23503' && err.constraint === 'blogposts_author_foreign';
        }, function (err) {
          throw noSuchAuthorError;
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
          return query
            .where('blogPosts.id', 'ilike', escapeForLike(args.params.postId))
            .then(transformAuthor)
            .then(function (posts) {
              if (!posts.length) {
                throw new NoSuchResourceError();
              }
              var post = posts[0];
              if (!post.active &&
                (!authUser || authUser.id !== post.author.id)) {
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
          var searchableParams = [];
          acceptOnlyAttributes(searchParams, searchableParams, function (attribute) {
            return 'Cannot filter by parameter ' + attribute + '.';
          });
          // TODO Interpret tag, postedTime, and author filters here.
          query = query.where(searchParams);

          // The query is finished.
          return query
            .then(transformAuthor)
            .then(function (posts) {

              // Remove inactive posts that don't belong to the authenticated user.
              return _.filter(posts, function (post) {
                var authorisedToViewInactive = !!authUser && authUser.id === post.author.id;
                return authorisedToViewInactive || post.active;
              });
            });
        }
      }).then(function (result) {
        return JSON.parse(JSON.stringify(result));
      });
    },

    update: function (args) {
      return authenticatedTransaction(knex, args.auth, function (trx, authUser) {
        if (!authUser) {
          throw new AuthorisationError('Blog posts cannot be updated anonymously');
        }
        if (!authUser.authorisedToBlog) {
          throw new AuthorisationError('You are not authorised to update blog posts');
        }

        var notUniqueIdError = new ConflictingEditError('That id already belongs to another post');
        var noSuchAuthorError = new ConflictingEditError('The given author does not exist');

        return validateAndTransform(args.body, {

          acceptableAttributes: [
            'id',
            'title',
            'body',
            'preview',
            'author',
            'postedTime',
            'active'
          ],

          checkIt: new Checkit({
            id: [
              {
                rule: 'alphaDash',
                message: 'The id must consist of letters, numbers, dashes, and underscores'
              }, {
                rule: 'minLength:10',
                message: 'The id must be at least 10 characters long'
              }, {
                rule: 'maxLength:255',
                message: 'The id must be at most 255 characters long'
              }, function (val) {
                // Check for case-insensitive uniqueness of ID.
                return trx
                  .from('blogPosts')
                  .select(['id'])
                  .where('id', 'ilike', escapeForLike(val))
                  .then(function (existingPosts) {
                    if (existingPosts && existingPosts.length) {
                      throw notUniqueIdError;
                    }
                  });
              }, function (val) {
                // Check that the ID starts with an ISO date.
                if (!val.substring(0, 10).match(/^\d\d\d\d\-\d\d\-\d\d$/)
                  || isNaN(new Date(val.substring(0, 10)).getTime())) {
                  throw new MalformedRequestError('The id must begin with a date in the format yyyy-mm-dd');
                }
              }
            ],
            title: [
              {
                rule: 'minLength:1',
                message: 'The title must be at least 1 character long'
              }, {
                rule: 'maxLength:255',
                message: 'The title must be at most 255 characters long'
              }
            ],
            body: ['maxLength:5000'],
            preview: ['maxLength:5000'],
            author: [
              function (val) {
                acceptOnlyAttributes(val, ['id'], function (attribute) {
                  return 'The attribute author.' + attribute + ' cannot be written during a post update';
                });
              }, function (val) {
                if (!val.id) {
                  throw new MalformedRequestError('The id of the author is required');
                }
              }, function (val) {
                // Check for existence of the author.
                return trx
                  .from('users')
                  .select(['id'])
                  .where('id', val.id)
                  .then(function (users) {
                    if (!users || !users.length) {
                      throw noSuchAuthorError;
                    }
                  });
              }, function (val) {
                // Check that the author is the authenticated user.
                if (val.id !== authUser.id) {
                  throw new AuthorisationError('You cannot change the ownership of a post to someone else');
                }
              }
            ],
            postedTime: [
              function (val) {
                if (isNaN(new Date(val).getTime())) {
                  throw new MalformedRequestError('postedTime must be a dateTime');
                }
              }
            ],
            active: ['boolean']
          }),

          transform: function (old) {
            var result = _.cloneDeep(old);
            if (result.postedTime) {
              result.postedTime = new Date(old.postedTime);
            }
            if (result.author && result.author.id) {
              result.author = result.author.id;
            }
            return result;
          }
        }).then(function (newPost) {

          // Do the insertion.
          return trx
            .into('blogPosts')
            .update(newPost)
            .returning([
              'id',
              'title',
              'body',
              'preview',
              'author',
              'postedTime',
              'active'
            ]);
        }).then(function (rows) {

          // Respond with the updated post.
          return rows[0];

          // Handle errors.
        }).catch(Checkit.Error, function (err) {
          var message = '';
          for (var attribute in err.errors) {
            message = attribute + '\n';
            var attrErrs = err.errors[attribute].errors;
            for (var i in attrErrs) {
              var specificErr = attrErrs[i];
              // If we have anything other than a ValidationError or a MalformedRequestError, throw it and forget about the rest.
              if (!(specificErr instanceof Checkit.ValidationError)
                && !(specificErr instanceof MalformedRequestError)) {
                throw specificErr;
              }
              message += '  ' + specificErr.message + '\n';
            }
          }
          message = message.trim();
          throw new MalformedRequestError(message);
        }).catch(function (err) {
          return err.code === '23505';
        }, function (err) {
          throw notUniqueIdError;
        }).catch(function (err) {
          return err.code === '23503' && err.constraint === 'blogposts_author_foreign';
        }, function (err) {
          throw noSuchAuthorError;
        });

      });
    }

  };
};
