'use strict'
const _ = require('lodash')
const AuthorisationError = require('../errors/authorisationError')
const NoSuchResourceError = require('../errors/noSuchResourceError')
const MalformedRequestError = require('../errors/malformedRequestError')
const ConflictingEditError = require('../errors/conflictingEditError')
const escapeForLike = require('./utilities/escapeForLike')
const authenticatedTransaction = require('./utilities/authenticatedTransaction')
const validate = require('../../utilities/validate')
const vf = validate.funcs
const ValidationError = validate.ValidationError

const transformAuthor = posts =>
  _.map(posts, post => ({
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
  }))

module.exports = knex => ({

  create: args =>
    authenticatedTransaction(knex, args.auth, (trx, authUser) => {
      if (!authUser) {
        throw new AuthorisationError('Blog posts cannot be created anonymously.')
      }
      if (!authUser.authorisedToBlog && !authUser.admin) {
        throw new AuthorisationError('You are not authorised to create blog posts.')
      }

      return validate(args.params || {}, {
        postId: [
          vf.notUndefined('The post id is required.'),
          vf.notNull('The post id is required.'),
          vf.string('The post id must be a string.'),
          vf.matchesRegex(/^[A-Za-z0-9_\-]*$/),
          vf.minLength('The id must be at least 10 characters long.', 10),
          vf.maxLength('The id must be at most 255 characters long.', 255),
          val => {
            if (val === undefined || val === null) {
              return
            }
            // Check for case-insensitive uniqueness of ID.
            return trx
              .from('blogPosts')
              .select(['id'])
              .where('id', 'ilike', escapeForLike(val))
              .then(function (existingPosts) {
                if (existingPosts && existingPosts.length) {
                  throw new ConflictingEditError('That id already belongs to another post.')
                }
              })
          },
          val => {
            if (val === undefined || val === null) {
              return
            }
            // Check that the ID starts with an ISO date.
            if (!val.substring(0, 10).match(/^\d\d\d\d\-\d\d\-\d\d$/)
              || isNaN(new Date(val.substring(0, 10)).getTime())) {
              throw new ValidationError('The id must begin with a date in the format yyyy-mm-dd.')
            }
          }
        ]
      }).then(() =>
        validate(args.body, {
          title: [
            vf.notUndefined('The title is required.'),
            vf.notNull('The title is required.'),
            vf.string('The title must be a string.'),
            vf.notEmpty('The title must not be empty.'),
            vf.maxLength('The title must be at most 255 characters long', 255)
          ],
          body: [
            vf.notUndefined('The body is required.'),
            vf.notNull('The body is required.'),
            vf.string('The body must be a string.'),
            vf.maxLength('The body must be at most 100,000 characters long', 100000)
          ],
          preview: [
            vf.string('The preview must be a string.'),
            vf.maxLength('The preview must be at most 5,000 characters long', 5000)
          ],
          author: [
            vf.notUndefined('The author is required.'),
            vf.notNull('The author is required.'),
            vf.object('The author must be an object.', {
              id: [
                vf.notUndefined('The author\'s id is required.'),
                vf.notNull('The author\'s id is required.'),
                vf.naturalNumber('The author\'s id must be a natural number.'),
                // Check for existence of the author.
                val => {
                  if (val === undefined || val === null) {
                    return
                  }
                  return trx
                    .from('users')
                    .select(['id'])
                    .where('id', val)
                    .then(function (users) {
                      if (!users || !users.length) {
                        throw new ValidationError('The given author does not exist.')
                      }
                    })
                },
                // Check that the author is the authenticated user or that the authenticated user is an admin.
                val => {
                  if (val === undefined || val === null) {
                    return
                  }
                  if (val !== authUser.id && !authUser.admin) {
                    throw new ValidationError('You cannot set the ownership of a post to someone else.')
                  }
                }
              ]
            })
          ],
          postedTime: [
            vf.notUndefined('The date is required.'),
            vf.notNull('The date is required.'),
            val => {
              if (val === undefined || val === null) {
                return
              }
              if (isNaN(new Date(val).getTime())) {
                throw new ValidationError('The date must be a dateTime.')
              }
            }
          ],
          active: [
            vf.boolean('The post must be set active or inactive.')
          ]
        })
      ).then(() => ({
        id: args.params.postId,
        title: args.body.title,
        body: args.body.body,
        preview: args.body.preview,
        postedTime: new Date(args.body.postedTime),
        author: args.body.author.id
      })).then(newPost =>
          // Do the insertion.
        trx
          .into('blogPosts')
          .insert(newPost)
          .returning('id')
      ).then(ids =>
        trx
          .from('blogPosts')
          .leftJoin('users', 'users.id', 'blogPosts.author')
          .where('blogPosts.id', 'ilike', escapeForLike(ids[0]))
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
          ])
      ).then(transformAuthor)
      // Respond with the newly created post.
      .then(rows => rows[0])

    }),

  read: args =>
    authenticatedTransaction(knex, args.auth, (trx, authUser) => {

      if (args.params && Object.keys(args.params).length && args.query && Object.keys(args.query).length) {
        throw new MalformedRequestError('A read against a specific blog post cannot filter by any other parameters.')
      }

      let query = trx
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
        ])

      function hideContents(post) {
        return {
          id: post.id,
          active: post.active,
          author: post.author
        }
      }

      if (args.params && args.params.postId) {

        // Read a specific post.
        return query
          .where('blogPosts.id', 'ilike', escapeForLike(args.params.postId))
          .then(transformAuthor)
          .then(posts => {
            if (!posts.length) {
              throw new NoSuchResourceError()
            }
            let post = posts[0]

            // Remove the contents of inactive posts that don't belong to the authenticated user.
            if (!post.active &&
              (!authUser || (authUser.id !== post.author.id && !authUser.admin))) {
              post = hideContents(post)
            }
            return post
          })

      } else {

        // Add sorting.
        query = query.orderBy('postedTime', 'desc')

        // Add offset.
        query = query.limit(20)
        if (args.query && args.query.offset) {
          query = query.offset(args.query.offset)
        }

        // Add search parameters.
        let searchParams = _.omit(args.query, ['offset']) || {}
        return validate(searchParams, {
          // No filter is accepted yet.
        }).then(() => {
          // TODO Interpret tag, postedTime, and author filters here.
          query = query.where(searchParams)

          // The query is finished.
          return query
        }).then(transformAuthor)
        // Remove the contents of inactive posts that don't belong to the authenticated user.
        .then(posts =>
          _.map(posts, post => {
            const authorisedToViewInactive = !!authUser && (authUser.id === post.author.id || !!authUser.admin)
            if (authorisedToViewInactive || post.active) {
              return post
            } else {
              return hideContents(post)
            }
          })
        )
      }
    }).then(function (result) {
      return JSON.parse(JSON.stringify(result))
    }),

  update: args =>
    authenticatedTransaction(knex, args.auth, function (trx, authUser) {
      if (!authUser) {
        throw new AuthorisationError('Blog posts cannot be updated anonymously.')
      }
      if (!authUser.authorisedToBlog && !authUser.admin) {
        throw new AuthorisationError('You are not authorised to update blog posts.')
      }

      const notUniqueIdError = new ConflictingEditError('That id already belongs to another post.')

      return knex
        .from('blogPosts')
        .where('id', 'ilike', escapeForLike(args.params.postId))
        .select()
        .then(posts => {
          if (!posts.length) {
            throw new NoSuchResourceError()
          }
          const post = posts[0]
          if (authUser.id !== post.author && !authUser.admin) {
            throw new AuthorisationError('You are not authorised to update this blog post.')
          }
          return validate(args.body, {
            id: [
              vf.notNull('The id cannot be unset.'),
              vf.string('The post id must be a string.'),
              vf.matchesRegex(/^[A-Za-z0-9_\-]*$/),
              vf.minLength('The id must be at least 10 characters long.', 10),
              vf.maxLength('The id must be at most 255 characters long.', 255),
              val => {
                if (val === undefined || val === null) {
                  return
                }
                // Check for case-insensitive uniqueness of ID if it's being changed.
                if (val.toLowerCase() !== args.params.postId.toLowerCase()) {
                  return trx
                    .from('blogPosts')
                    .select(['id'])
                    .where('id', 'ilike', escapeForLike(val))
                    .then(existingPosts => {
                      if (existingPosts && existingPosts.length) {
                        throw notUniqueIdError
                      }
                    })
                }
              },
              val => {
                if (val === undefined || val === null) {
                  return
                }
                // Check that the ID starts with an ISO date.
                if (!val.substring(0, 10).match(/^\d\d\d\d\-\d\d\-\d\d$/)
                  || isNaN(new Date(val.substring(0, 10)).getTime())) {
                  throw new MalformedRequestError('The id must begin with a date in the format yyyy-mm-dd.')
                }
              }
            ],
            title: [
              vf.notNull('The title cannot be unset.'),
              vf.string('The title must be a string.'),
              vf.notEmpty('The title must not be empty.'),
              vf.maxLength('The title must be at most 255 characters long', 255)
            ],
            body: [
              vf.notNull('The body is cannot be unset.'),
              vf.string('The body must be a string.'),
              vf.maxLength('The body must be at most 100,000 characters long', 100000)
            ],
            preview: [
              vf.string('The preview must be a string.'),
              vf.maxLength('The preview must be at most 5,000 characters long', 5000)
            ],
            author: [
              vf.notNull('The author is cannot be unset.'),
              vf.object('The author must be an object.', {
                id: [
                  vf.notUndefined('The author\'s id is required.'),
                  vf.notNull('The author\'s id is required.'),
                  vf.naturalNumber('The author\'s id must be a natural number.'),
                  // Check for existence of the author.
                  val => {
                    if (val === undefined || val === null) {
                      return
                    }
                    return trx
                      .from('users')
                      .select(['id'])
                      .where('id', val)
                      .then(function (users) {
                        if (!users || !users.length) {
                          throw new ValidationError('The given author does not exist.')
                        }
                      })
                  },
                  // Check that the author is the authenticated user or that the authenticated user is an admin.
                  val => {
                    if (val === undefined || val === null) {
                      return
                    }
                    if (val !== authUser.id && !authUser.admin) {
                      throw new ValidationError('You cannot change the ownership of a post to someone else.')
                    }
                  }
                ]
              })
            ],
            postedTime: [
              vf.notNull('The date cannot be unset.'),
              val => {
                if (val === undefined || val === null) {
                  return
                }
                if (isNaN(new Date(val).getTime())) {
                  throw new ValidationError('The date must be a dateTime.')
                }
              }
            ],
            active: [
              vf.notNull('The post must be set active or inactive.'),
              vf.boolean('The post must be set active or inactive.')
            ]
          })
        }).then(() => {
          let result = _.cloneDeep(args.body)
          if (result.postedTime) {
            result.postedTime = new Date(result.postedTime)
          }
          if (result.author && result.author.id) {
            result.author = result.author.id
          }
          return result

        // Do the insertion.
        }).then(newPost =>
          trx
            .into('blogPosts')
            .where('id', 'ilike', escapeForLike(args.params.postId))
            .update(newPost)
            .returning('id')
        ).then(ids =>
          trx
            .from('blogPosts')
            .leftJoin('users', 'users.id', 'blogPosts.author')
            .where('blogPosts.id', 'ilike', escapeForLike(ids[0]))
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
            ])
        ).then(transformAuthor)
        // Respond with the updated post.
        .then(posts => posts[0])
    }),

  delete: args =>
    authenticatedTransaction(knex, args.auth, (trx, authUser) => {
      if (!authUser) {
        throw new AuthorisationError('Blog posts cannot be deleted anonymously.')
      }
      if (!authUser.authorisedToBlog && !authUser.admin) {
        throw new AuthorisationError('You are not authorised to delete blog posts.')
      }
      return knex
        .from('blogPosts')
        .where('id', 'ilike', escapeForLike(args.params.postId))
        .select()
        .then(posts => {
          if (!posts.length) {
            throw new NoSuchResourceError()
          }
          const post = posts[0]
          if (authUser.id !== post.author) {
            throw new AuthorisationError('You are not authorised to delete this blog post.')
          }
          return knex
            .from('blogPosts')
            .where('id', 'ilike', escapeForLike(args.params.postId))
            .del()
            .then(() => null)
        })
    })

})
