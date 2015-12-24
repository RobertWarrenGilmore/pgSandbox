var _ = require('lodash');
var AuthorisationError = require('../errors/authorisationError');
var NoSuchResourceError = require('../errors/noSuchResourceError');
var MalformedRequestError = require('../errors/malformedRequestError');
var ConflictingEditError = require('../errors/conflictingEditError');
var escapeForLike = require('./utilities/escapeForLike');
var authenticatedTransaction = require('./utilities/authenticatedTransaction');
var validate = require('./utilities/validate');

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

module.exports = function (knex) {

  return {

    create: function (args) {
      return authenticatedTransaction(knex, args.auth, function (trx, authUser) {
        if (!authUser) {
          throw new AuthorisationError('Blog posts cannot be created anonymously.');
        }
        if (!authUser.authorisedToBlog) {
          throw new AuthorisationError('You are not authorised to create blog posts.');
        }

        return validate(args.body, {
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
                    throw new ConflictingEditError('That id already belongs to another post.');
                  }
                });
            }, function (val) {
              // Check that the ID starts with an ISO date.
              if (!val.substring(0, 10).match(/^\d\d\d\d\-\d\d\-\d\d$/)
                || isNaN(new Date(val.substring(0, 10)).getTime())) {
                throw new MalformedRequestError('The id must begin with a date in the format yyyy-mm-dd.');
              }
            }
          ],
          title: [
            {
              rule: 'required',
              message: 'The title is required.'
            },
            {
              rule: 'minLength:1',
              message: 'The title must be at least 1 character long.'
            }, {
              rule: 'maxLength:255',
              message: 'The title must be at most 255 characters long.'
            }
          ],
          body: ['required', 'maxLength:5000'],
          preview: ['maxLength:5000'],
          author: [
            'required',
            function (author) {
              return validate(author, {
                id: [
                  'required',
                  'natural',
                  // Check for existence of the author.
                  function (val) {
                    return trx
                      .from('users')
                      .select(['id'])
                      .where('id', val)
                      .then(function (users) {
                        if (!users || !users.length) {
                          throw new ConflictingEditError('The given author does not exist.');
                        }
                      });
                  },
                  // Check that the author is the authenticated user.
                  function (val) {
                    if (val !== authUser.id) {
                      throw new AuthorisationError('You cannot change the ownership of a post to someone else.');
                    }
                  }
                ]
              });
            }
          ],
          postedTime: [
            'date',
            {
              rule: 'required',
              message: 'The postedTime is required'
            }, function (val) {
              if (isNaN(new Date(val).getTime())) {
                throw new MalformedRequestError('postedTime must be a dateTime.');
              }
            }
          ],
          active: ['boolean']

        }).then(function () {
          return {
            id: args.body.id,
            title: args.body.title,
            body: args.body.body,
            preview: args.body.preview,
            postedTime: new Date(args.body.postedTime),
            author: args.body.author.id
          };

        }).then(function (newPost) {

            // Do the insertion.
          return trx
            .into('blogPosts')
            .insert(newPost)
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

          // Respond with the newly created post.
          return rows[0];
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
          var searchParams = _.omit(args.query, ['offset']) || {};
          return validate(searchParams, {
            // No filter is accepted yet.
          }).then(function () {
            // TODO Interpret tag, postedTime, and author filters here.
            query = query.where(searchParams);

            // The query is finished.
            return query;
          }).then(transformAuthor)
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
          throw new AuthorisationError('Blog posts cannot be updated anonymously.');
        }
        if (!authUser.authorisedToBlog) {
          throw new AuthorisationError('You are not authorised to update blog posts.');
        }

        var notUniqueIdError = new ConflictingEditError('That id already belongs to another post.');
        var noSuchAuthorError = new ConflictingEditError('The given author does not exist.');

        return knex
          .from('blogPosts')
          .where('id', 'ilike', escapeForLike(args.params.postId))
          .select()
          .then(function (posts) {
            if (!posts.length) {
              throw new NoSuchResourceError();
            }
            var post = posts[0];
            if (authUser.id !== post.author) {
              throw new AuthorisationError('You are not authorised to update this blog post.');
            }
            return validate(args.body, {
              id: [
                'notNull',
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
                    throw new MalformedRequestError('The id must begin with a date in the format yyyy-mm-dd.');
                  }
                }
              ],
              title: [
                'notNull',
                {
                  rule: 'minLength:1',
                  message: 'The title must be at least 1 character long'
                }, {
                  rule: 'maxLength:255',
                  message: 'The title must be at most 255 characters long'
                }
              ],
              body: [
                'notNull',
                'maxLength:5000'
              ],
              preview: ['maxLength:5000'],
              author: [
                'notNull',
                function (author) {
                  return validate(author, {
                    id: [
                      'required',
                      'natural',
                      // Check for existence of the author.
                      function (val) {
                        return trx
                          .from('users')
                          .select(['id'])
                          .where('id', val)
                          .then(function (users) {
                            if (!users || !users.length) {
                              throw noSuchAuthorError;
                            }
                          });
                      },
                      // Check that the author is the authenticated user.
                      function (val) {
                        if (val !== authUser.id) {
                          throw new AuthorisationError('You cannot change the ownership of a post to someone else.');
                        }
                      }
                    ]
                  });
                }
              ],
              postedTime: [
                'notNull',
                function (val) {
                  if (isNaN(new Date(val).getTime())) {
                    throw new MalformedRequestError('postedTime must be a dateTime.');
                  }
                }
              ],
              active: [
                'notNull',
                'boolean'
              ]

            });
          }).then(function () {
            var result = _.cloneDeep(args.body);
            if (result.postedTime) {
              result.postedTime = new Date(result.postedTime);
            }
            if (result.author && result.author.id) {
              result.author = result.author.id;
            }
            return result;

          }).then(function (newPost) {
            // Do the insertion.
            return trx
              .into('blogPosts')
              .update(newPost);
          }).then(function () {
            return trx
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
          }).then(transformAuthor)
          .then(function (posts) {
            // Respond with the updated post.
            return posts[0];
          });
      });
    },

    delete: function (args) {
      return authenticatedTransaction(knex, args.auth, function (trx, authUser) {
        if (!authUser) {
          throw new AuthorisationError('Blog posts cannot be deleted anonymously.');
        }
        if (!authUser.authorisedToBlog) {
          throw new AuthorisationError('You are not authorised to delete blog posts.');
        }
        return knex
          .from('blogPosts')
          .where('id', 'ilike', escapeForLike(args.params.postId))
          .select()
          .then(function (posts) {
            if (!posts.length) {
              throw new NoSuchResourceError();
            }
            var post = posts[0];
            if (authUser.id !== post.author) {
              throw new AuthorisationError('You are not authorised to delete this blog post.');
            }
            return knex
              .from('blogPosts')
              .where('id', 'ilike', escapeForLike(args.params.postId))
              .del();
          });
      });
    }

  };
};
