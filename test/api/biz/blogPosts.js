'use strict'
const assert = require('assert')
const knex = require('../../../api/database/knex')
const escapeForLike = require('../../../api/biz/utilities/escapeForLike')
const bcrypt = require('bcrypt')
const BlogPost = require('../../../api/biz/blogPosts')(knex)
const AuthenticationError = require('../../../errors/authenticationError')
const AuthorisationError = require('../../../errors/authorisationError')
const MalformedRequestError = require('../../../errors/malformedRequestError')
const ConflictingEditError = require('../../../errors/conflictingEditError')
const NoSuchResourceError = require('../../../errors/noSuchResourceError')
const validate = require('../../../utilities/validate')
const { ValidationError } = validate
const moment = require('moment-timezone')

describe('blog posts', () => {
  const emailAddress = 'mocha.test.email.address@not.a.real.domain.com'
  let authorId
  const password = 'taco tuesday'
  const givenName = 'Victor'
  const familyName = 'Frankenstein'
  const passwordHash = bcrypt.hashSync(password, bcrypt.genSaltSync(8))

  const createdIds = []
  const id = '2015-12-17_a_test_post_for_the_mocha_test_suite'
  const title = 'A Test Post for the Mocha Test Suite'
  const body = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque ipsum erat, porttitor vitae bibendum eu, interdum at metus. Etiam fermentum lectus eu leo semper suscipit. Nam pharetra nisl quis nisi ullamcorper viverra. Donec vehicula ac neque a euismod. Duis venenatis, massa ut porttitor gravida, velit arcu porttitor erat, vitae fringilla sapien velit vel urna. Duis vel orci eget ante feugiat molestie eu a felis. Aenean sollicitudin interdum eros, vitae euismod ligula suscipit ac. Proin nec libero lacus. Aenean libero justo, placerat sed nisl vel, sollicitudin pellentesque erat. Morbi rhoncus risus et dolor auctor posuere. Nam aliquam, eros in vulputate euismod, purus odio mollis velit, ut tincidunt eros elit eu ex. Donec libero lorem, suscipit non augue nec, vulputate sodales dui. Sed semper felis a augue imperdiet eleifend. Proin semper viverra eleifend. Morbi vehicula pretium eros, sit amet hendrerit enim posuere sed. Nam venenatis malesuada purus ut pulvinar.\n\n' +
    'Nulla eu odio accumsan, efficitur mauris vitae, placerat nulla. Mauris nec ornare orci, a pretium orci. Vivamus mollis lorem non diam sagittis, nec rutrum dui tempor. Sed sed convallis libero. Proin mattis quam vel justo ultricies efficitur. Etiam aliquet vitae ex non gravida. Cras eget molestie ipsum. Praesent viverra cursus tempus. Nulla diam tortor, dictum ac ullamcorper id, blandit a odio. Sed fermentum purus eu ipsum suscipit, quis egestas mauris porta. In hac habitasse platea dictumst. Maecenas pharetra nisl ut justo accumsan ornare. Vestibulum massa mi, semper eu ex vel, hendrerit auctor velit.\n\n' +
    'Nulla tempus nisi varius, lacinia tortor id, dapibus quam. Phasellus venenatis eu dolor et dapibus. Nunc placerat porta enim sed fringilla. Suspendisse vel mi quam. Morbi facilisis gravida eros, nec dapibus nulla efficitur vel. Ut quam turpis, volutpat ac egestas in, ullamcorper eu velit. Fusce laoreet, elit mattis congue pellentesque, lacus dolor lobortis leo, id malesuada turpis ante id elit. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos.\n\n' +
    'Pellentesque in risus quis mi egestas tempus. Vestibulum ex mi, aliquet sit amet dui eu, viverra tristique libero. Aliquam erat volutpat. Donec pharetra semper ex, in finibus nisi lobortis vitae. Nam quis arcu mi. Donec gravida iaculis ultricies. Ut vitae enim sit amet velit ornare consectetur sit amet eget mi. Sed eleifend, nunc rhoncus lacinia placerat, ante enim convallis magna, eu vehicula erat dolor posuere dui.\n\n' +
    'Nullam rhoncus justo quis tellus pulvinar, vel interdum nibh rhoncus. Cras ultrices tempor purus vel mollis. Fusce eget massa aliquam, feugiat orci eget, facilisis tellus. Aenean vel ligula odio. Praesent vel nunc ac purus auctor dapibus vel et ligula. Morbi tristique libero et est cursus suscipit. Ut facilisis sapien neque, et ultrices eros luctus nec. Curabitur placerat dolor eget nibh gravida commodo. Phasellus et blandit sem.'
  const preview = 'This is a very short preview for a long post.'
  const postedTime = moment()
  const timeZone = 'Europe/Moscow'

  beforeEach('Create an author.', () => {
    return knex.into('users').insert({
      emailAddress,
      givenName,
      familyName,
      passwordHash,
      authorisedToBlog: true
    })
    .returning('id')
    .then(ids => {
      authorId = ids[0]
    })
  })

  afterEach('Delete any created test posts.', () => {
    return Promise.all(createdIds.map(function (deletionId) {
      return knex
        .from('blogPosts')
        .where('id', 'ilike', escapeForLike(deletionId))
        .del()
    }))
    .then(() => {
      createdIds.length = 0
    })
  })

  afterEach('Destroy the author.', () => {
    return knex
      .from('users')
      .del()
  })

  describe('create', () => {

    it('should work with good auth and minimal attributes', () => {
      return BlogPost.create({
        auth: {
          emailAddress,
          password
        },
        params: {
          postId: id
        },
        body: {
          title,
          body,
          postedTime,
          timeZone,
          author: {
            id: authorId
          }
        }
      })
      .then(function (post) {
        return knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id))
      })
      .then(function (posts) {
        createdIds.push(posts[0].id)
        assert(posts[0], 'No post was created.')
      })
    })

    it('should work with good auth and all attributes', () => {
      return BlogPost.create({
        auth: {
          emailAddress,
          password
        },
        params: {
          postId: id
        },
        body: {
          title,
          body,
          preview,
          postedTime,
          timeZone,
          active: true,
          author: {
            id: authorId
          }
        }
      })
      .then(function (post) {
        return knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id))
      })
      .then(function (posts) {
        createdIds.push(id)
        assert(posts[0], 'No post was created.')
      })
    })

    it('should return the proper contents', () => {
      return BlogPost.create({
        auth: {
          emailAddress,
          password
        },
        params: {
          postId: id
        },
        body: {
          title,
          body,
          preview,
          postedTime: postedTime.valueOf(),
          timeZone,
          active: true,
          author: {
            id: authorId
          }
        }
      })
      .then(function (post) {
        createdIds.push(id)
        assert(!(post instanceof Array), 'An array was returned instead of a single post.')
        assert.deepStrictEqual(post, {
          id,
          title,
          body,
          postedTime: postedTime.valueOf(),
          timeZone,
          author: {
            id: authorId,
            givenName,
            familyName,
            active: true
          },
          active: true,
          preview: preview
        }, 'The returned post was incorrect.')
      })
    })

    it('should fail with bad auth and minimal attributes', () => {
      return BlogPost.create({
        auth: {
          emailAddress,
          password: password + 'a'
        },
        params: {
          postId: id
        },
        body: {
          title,
          body,
          postedTime,
          timeZone,
          author: {
            id: authorId
          }
        }
      })
      .then(function (post) {
        return knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id))
      })
      .then(function (posts) {
        createdIds.push(posts[0].id)
        assert(false, 'The creation succeeded.')
      })
      .catch(err => {
        if (err instanceof AuthenticationError) {
        } else {
          throw err
        }
      })
    })

    it('should fail with no auth and minimal attributes', () => {
      return BlogPost.create({
        params: {
          postId: id
        },
        body: {
          title,
          body,
          postedTime,
          timeZone,
          author: {
            id: authorId
          }
        }
      })
      .then(function (post) {
        return knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id))
      })
      .then(function (posts) {
        createdIds.push(posts[0].id)
        assert(false, 'The creation succeeded.')
      })
      .catch(err => {
        if (err instanceof AuthorisationError) {
        } else {
          throw err
        }
      })
    })

    it('should fail with a poorly formatted post id', () => {
      return BlogPost.create({
        auth: {
          emailAddress,
          password
        },
        params: {
          postId: 'This_id_does_not_start_with_a_date'
        },
        body: {
          title,
          body,
          postedTime,
          timeZone,
          author: {
            id: authorId
          }
        }
      })
      .then(function (post) {
        return knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id))
      })
      .then(function (posts) {
        createdIds.push(posts[0].id)
        assert(false, 'The creation succeeded.')
      })
      .catch(err => {
        if (err instanceof ValidationError) {
          if (Object.keys(err.messages).length !== 1
            || !err.messages.postId
            || err.messages.postId.length !== 1) {
            throw err
          }
        } else {
          throw err
        }
      })
    })

    it('should fail with a poorly formatted posted time', () => {
      return BlogPost.create({
        auth: {
          emailAddress,
          password
        },
        params: {
          postId: id
        },
        body: {
          title,
          body,
          postedTime: 'the third of October in the year twenty fifteen',
          timeZone,
          author: {
            id: authorId
          }
        }
      })
      .then(function (post) {
        return knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id))
      })
      .then(function (posts) {
        createdIds.push(posts[0].id)
        assert(false, 'The creation succeeded.')
      })
      .catch(err => {
        if (err instanceof ValidationError) {
          if (Object.keys(err.messages).length !== 1
            || !err.messages.postedTime
            || err.messages.postedTime.length !== 1) {
            throw err
          }
        } else {
          throw err
        }
      })
    })

    it('should fail with a poorly formatted time zone', () => {
      return BlogPost.create({
        auth: {
          emailAddress,
          password
        },
        params: {
          postId: id
        },
        body: {
          title,
          body,
          postedTime,
          timeZone: 'over yonder past the river',
          author: {
            id: authorId
          }
        }
      })
      .then(function (post) {
        return knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id))
      })
      .then(function (posts) {
        createdIds.push(posts[0].id)
        assert(false, 'The creation succeeded.')
      })
      .catch(err => {
        if (err instanceof ValidationError) {
          if (Object.keys(err.messages).length !== 1
            || !err.messages.timeZone
            || err.messages.timeZone.length !== 1) {
            throw err
          }
        } else {
          throw err
        }
      })
    })

    it('should reject silly attributes', () => {
      return BlogPost.create({
        auth: {
          emailAddress,
          password
        },
        params: {
          postId: id
        },
        body: {
          title,
          body,
          postedTime,
          timeZone,
          author: {
            id: authorId
          },
          silly: 'this is not a legal attribute'
        }
      })
      .then(function (post) {
        return knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id))
      })
      .then(function (posts) {
        createdIds.push(posts[0].id)
        assert(false, 'The creation succeeded.')
      })

      .catch(err => {
        if (err instanceof ValidationError) {
          if (Object.keys(err.messages).length !== 1
            || !err.messages.silly
            || err.messages.silly.length !== 1) {
            throw err
          }
        } else {
          throw err
        }
      })
    })

    it('should fail if the id is not unique', () => {
      return knex.into('blogPosts').insert({
        id: id,
        title: title,
        body: body,
        postedTime: postedTime,
        author: authorId
      })
      .then(() => {
        createdIds.push(id)
        return BlogPost.create({
          auth: {
            emailAddress,
            password
          },
          params: {
            postId: id
          },
          body: {
            title,
            body,
            postedTime,
            timeZone,
            author: {
              id: authorId
            }
          }
        })
      })
      .then(function (post) {
        return knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id))
      })
      .then(function (posts) {
        createdIds.push(posts[0].id)
        assert(false, 'The creation succeeded.')
      })
      .catch(err => {
        if (err instanceof ConflictingEditError) {
        } else {
          throw err
        }
      })
    })

    it('should fail if the id is omitted', () => {
      return BlogPost.create({
        auth: {
          emailAddress,
          password
        },
        body: {
          title,
          body,
          postedTime,
          timeZone,
          author: {
            id: authorId
          }
        }
      }).then(function (post) {
        return knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id))
      }).then(function (posts) {
        createdIds.push(posts[0].id)
        assert(false, 'The creation succeeded.')
      })
      .catch(err => {
        if (err instanceof ValidationError) {
          if (Object.keys(err.messages).length !== 1
            || !err.messages.postId
            || err.messages.postId.length !== 1) {
            throw err
          }
        } else {
          throw err
        }
      })
    })

    it('should fail if the body is omitted', () => {
      return BlogPost.create({
        auth: {
          emailAddress,
          password
        },
        params: {
          postId: id
        },
        body: {
          title,
          postedTime,
          timeZone,
          author: {
            id: authorId
          }
        }
      })
      .then(function (post) {
        return knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id))
      })
      .then(function (posts) {
        createdIds.push(posts[0].id)
        assert(false, 'The creation succeeded.')
      })
      .catch(err => {
        if (err instanceof ValidationError) {
          if (Object.keys(err.messages).length !== 1
            || !err.messages.body
            || err.messages.body.length !== 1) {
            throw err
          }
        } else {
          throw err
        }
      })
    })

    it('should fail if the title is omitted', () => {
      return BlogPost.create({
        auth: {
          emailAddress,
          password
        },
        params: {
          postId: id
        },
        body: {
          body,
          postedTime,
          timeZone,
          author: {
            id: authorId
          }
        }
      })
      .then(function (post) {
        return knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id))
      })
      .then(function (posts) {
        createdIds.push(posts[0].id)
        assert(false, 'The creation succeeded.')
      })
      .catch(err => {
        if (err instanceof ValidationError) {
          if (Object.keys(err.messages).length !== 1
            || !err.messages.title
            || err.messages.title.length !== 1) {
            throw err
          }
        } else {
          throw err
        }
      })
    })

    it('should fail if the postedTime is omitted', () => {
      return BlogPost.create({
        auth: {
          emailAddress,
          password
        },
        params: {
          postId: id
        },
        body: {
          title,
          body,
          timeZone,
          author: {
            id: authorId
          }
        }
      })
      .then(function (post) {
        return knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id))
      })
      .then(function (posts) {
        createdIds.push(posts[0].id)
        assert(false, 'The creation succeeded.')
      })
      .catch(err => {
        if (err instanceof ValidationError) {
          if (Object.keys(err.messages).length !== 1
            || !err.messages.postedTime
            || err.messages.postedTime.length !== 1) {
            throw err
          }
        } else {
          throw err
        }
      })
    })

    it('should fail if the timeZone is omitted', () => {
      return BlogPost.create({
        auth: {
          emailAddress,
          password
        },
        params: {
          postId: id
        },
        body: {
          title: title,
          body: body,
          postedTime,
          author: {
            id: authorId
          }
        }
      })
      .then(function (post) {
        return knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id))
      })
      .then(function (posts) {
        createdIds.push(posts[0].id)
        assert(false, 'The creation succeeded.')
      })
      .catch(err => {
        if (err instanceof ValidationError) {
          if (Object.keys(err.messages).length !== 1
            || !err.messages.timeZone
            || err.messages.timeZone.length !== 1) {
            throw err
          }
        } else {
          throw err
        }
      })
    })

    it('should fail if the author is omitted', () => {
      return BlogPost.create({
        auth: {
          emailAddress,
          password
        },
        params: {
          postId: id
        },
        body: {
          title: title,
          body: body,
          postedTime: postedTime,
          timeZone
        }
      })
      .then(function (post) {
        return knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id))
      })
      .then(function (posts) {
        createdIds.push(posts[0].id)
        assert(false, 'The creation succeeded.')
      })
      .catch(err => {
        if (err instanceof ValidationError) {
          if (Object.keys(err.messages).length !== 1
            || !err.messages.author
            || err.messages.author.length !== 1) {
            throw err
          }
        } else {
          throw err
        }
      })
    })

    it('should fail if the author\'s id is omitted', () => {
      return BlogPost.create({
        auth: {
          emailAddress,
          password
        },
        params: {
          postId: id
        },
        body: {
          title: title,
          body: body,
          postedTime: postedTime,
          timeZone,
          author: {}
        }
      })
      .then(function (post) {
        return knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id))
      })
      .then(function (posts) {
        createdIds.push(posts[0].id)
        assert(false, 'The creation succeeded.')
      })
      .catch(err => {
        if (err instanceof ValidationError) {
          if (Object.keys(err.messages).length !== 1
            || !err.messages.author
            || Object.keys(err.messages.author).length !== 1
            || err.messages.author.id.length !== 1) {
            throw err
          }
        } else {
          throw err
        }
      })
    })

    it('should fail if the author\'s givenName is included', () => {
      return BlogPost.create({
        auth: {
          emailAddress,
          password
        },
        params: {
          postId: id
        },
        body: {
          title: title,
          body: body,
          postedTime: postedTime,
          timeZone,
          author: {
            id: authorId,
            givenName: 'George'
          }
        }
      })
      .then(function (post) {
        return knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id))
      })
      .then(function (posts) {
        createdIds.push(posts[0].id)
        assert(false, 'The creation succeeded.')
      })
      .catch(err => {
        if (err instanceof ValidationError) {
          if (Object.keys(err.messages).length !== 1
            || !err.messages.author
            || Object.keys(err.messages.author).length !== 1
            || err.messages.author.givenName.length !== 1) {
            throw err
          }
        } else {
          throw err
        }
      })
    })

    it('should fail if the author is not a user', () => {
      return BlogPost.create({
        auth: {
          emailAddress,
          password
        },
        params: {
          postId: id
        },
        body: {
          title: title,
          body: body,
          postedTime: postedTime,
          timeZone,
          author: {
            id: authorId + 1
          }
        }
      })
      .then(function (post) {
        return knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id))
      })
      .then(function (posts) {
        createdIds.push(posts[0].id)
        assert(false, 'The creation succeeded.')
      })
      .catch(err => {
        if (err instanceof ValidationError) {
          if (Object.keys(err.messages).length !== 1
            || !err.messages.author
            || Object.keys(err.messages.author).length !== 1
            || err.messages.author.id.length !== 1) {
            throw err
          }
        } else {
          throw err
        }
      })
    })

    it('should fail if the author is not the authenticated user', () => {
      let otherAuthorId
      const otherAuthorEmailAddress = 'a' + emailAddress
      return knex.into('users')
        .insert({
          emailAddress: otherAuthorEmailAddress,
          givenName,
          familyName,
          passwordHash,
          authorisedToBlog: true
        })
        .returning('id').then(ids => {
          otherAuthorId = ids[0]
        })
        .then(() =>
          BlogPost.create({
            auth: {
              emailAddress,
              password
            },
            params: {
              postId: id
            },
            body: {
              title: title,
              body: body,
              postedTime: postedTime,
              timeZone,
              author: {
                id: otherAuthorId
              }
            }
          })
        )
        .then(post =>
          knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id))
        )
        .then(posts => {
          createdIds.push(posts[0].id)
          assert(false, 'The creation succeeded.')
        })
        .catch(err => {
          if (err instanceof ValidationError) {
            if (Object.keys(err.messages).length !== 1
              || !err.messages.author
              || Object.keys(err.messages.author).length !== 1
              || err.messages.author.id.length !== 1) {
              throw err
            }
          } else {
            throw err
          }
        })
        .then(() =>
          knex
            .from('users')
            .where('id', otherAuthorId)
            .del()
        )

    })

    it('should fail if the user is not authorised to blog', () => {
      return knex.from('users').where('id', authorId).update({
        authorisedToBlog: false
      }).then(() => {
        return BlogPost.create({
          auth: {
            emailAddress,
            password
          },
          params: {
            postId: id
          },
          body: {
            title: title,
            body: body,
            postedTime: postedTime,
            author: {
              id: authorId
            }
          }
        })
      })
      .then(function (post) {
        return knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id))
      })
      .then(function (posts) {
        createdIds.push(posts[0].id)
        assert(false, 'The creation succeeded.')
      })
      .catch(err => {
        if (err instanceof AuthorisationError) {
        } else {
          throw err
        }
      })
    })

  })

  describe('read', () => {

    let searchablePosts

    beforeEach('Create the searchable posts.', () => {
      searchablePosts = [{
        id: id + 'a',
        title,
        body,
        postedTime: postedTime.clone().add(4, 'days'),
        timeZone,
        author: authorId
      }, {
        id: id + 'b',
        title,
        body,
        postedTime: postedTime.clone().add(3, 'days'),
        timeZone,
        author: authorId
      }, {
        id: id + 'c',
        title,
        body,
        postedTime: postedTime.clone().add(2, 'days'),
        timeZone,
        author: authorId
      }, {
        id: id + 'd',
        title,
        body,
        postedTime: postedTime.clone().add(1, 'days'),
        timeZone,
        author: authorId
      }]
      return knex.into('blogPosts').insert(searchablePosts).returning('id')
        .then(function (returnedIds) {
          Array.prototype.push.apply(createdIds, returnedIds)
        })
    })

    it('should be able to look up by postId', () => {
      return BlogPost.read({
        params: {
          postId: createdIds[0]
        }
      })
      .then(function (post) {
        assert(!(post instanceof Array), 'An array was returned instead of a single post.')
        assert(!!post.id, 'The returned post had no id.')
      })
    })

    it('should return the proper contents', () => {
      return BlogPost.read({
        params: {
          postId: createdIds[0]
        }
      })
      .then(function (post) {
        assert(!(post instanceof Array), 'An array was returned instead of a single post.')
        const exp = searchablePosts[0]
        assert.deepStrictEqual(post, {
          id: exp.id,
          title: exp.title,
          body: exp.body,
          postedTime: exp.postedTime.valueOf(),
          timeZone,
          author: {
            id: authorId,
            givenName,
            familyName,
            active: true
          },
          active: true,
          preview: null
        }, 'The returned post was incorrect.')
      })
    })

    it('should fail to look up a non-existent post', () => {
      return BlogPost.read({
        params: {
          postId: createdIds[createdIds.length] + 'a'
        }
      })
      .then(function (post) {
        assert(false, 'The read succeeded')
      })
      .catch(err => {
        if (err instanceof NoSuchResourceError) {
        } else {
          throw err
        }
      })
    })

    it('should fail to look up the contents of an inactive post without authenticating', () => {
      return knex.into('blogPosts').where('id', 'ilike', escapeForLike(createdIds[0]))
        .update({
          active: false
        }).then(() => {
          return BlogPost.read({
            params: {
              postId: createdIds[0]
            }
          })
        }).then(function (post) {
          assert.strictEqual(post.title, undefined, 'The title was returned.')
          assert.strictEqual(post.body, undefined, 'The body was returned.')
          assert.strictEqual(post.preview, undefined, 'The preview was returned.')
          assert.strictEqual(post.postedTime, undefined, 'The posted time was returned.')
          assert.strictEqual(post.active, false, 'The post was active.')
          assert.strictEqual(post.author.id, authorId, 'The post did not have the right author.')
        })
    })

    it('should fail to look up the contents of an inactive post that belongs to someone else', () => {

      // Create the other author.
      let otherAuthorId
      const otherAuthorEmailAddress = 'a' + emailAddress
      return knex.into('users')
        .insert({
          emailAddress: otherAuthorEmailAddress,
          givenName,
          familyName,
          passwordHash,
          authorisedToBlog: true
        }).returning('id').then(function (ids) {
          otherAuthorId = ids[0]
        }).then(() => {

          // Deactivate the post.
          return knex.into('blogPosts').where('id', 'ilike', escapeForLike(createdIds[0]))
            .update({
              active: false
            })
        }).then(() => {

          // Authenticate as the other author.
          return BlogPost.read({
            auth: {
              emailAddress: otherAuthorEmailAddress,
              password
            },
            params: {
              postId: createdIds[0]
            }
          })

        // Assert stuff.
        })
        .then(post => {
          assert.strictEqual(post.title, undefined, 'The title was returned.')
          assert.strictEqual(post.body, undefined, 'The body was returned.')
          assert.strictEqual(post.preview, undefined, 'The preview was returned.')
          assert.strictEqual(post.postedTime, undefined, 'The posted time was returned.')
          assert.strictEqual(post.active, false, 'The post was active.')
          assert.strictEqual(post.author.id, authorId, 'The post did not have the right author.')
        })

        // Destroy the other author.
        .then(() =>
          knex
            .from('users')
            .where('id', otherAuthorId)
            .del()
        )
    })

    it('should be able to look up the contents of an inactive post that belongs to oneself', () => {
      return knex.into('blogPosts').where('id', 'ilike', escapeForLike(createdIds[0]))
        .update({
          active: false
        }).then(() => {
          return BlogPost.read({
            auth: {
              emailAddress,
              password
            },
            params: {
              postId: createdIds[0]
            }
          })
        }).then(function (post) {
          assert(!(post instanceof Array), 'An array was returned instead of a single post.')
          assert.strictEqual(post.title, searchablePosts[0].title, 'The wrong title was returned.')
          assert.strictEqual(post.body, searchablePosts[0].body, 'The wrong body was returned.')
          assert(searchablePosts[0].postedTime.isSame(post.postedTime), 'The wrong posted time was returned.')
          assert.strictEqual(post.active, false, 'The post was active.')
          assert.strictEqual(post.author.id, searchablePosts[0].author, 'The post did not have the right author.')
        })
    })

    it('should be able to look up the contents of an inactive post of another user as an admin', () => {

      // Create the other author.
      let otherAuthorId
      const otherAuthorEmailAddress = 'a' + emailAddress
      return knex.into('users')
        .insert({
          emailAddress: otherAuthorEmailAddress,
          givenName,
          familyName,
          passwordHash,
          authorisedToBlog: false,
          admin: true
        })
        .returning('id')
        .then(ids => {
          otherAuthorId = ids[0]
        })

        // Deactivate the post.
        .then(() =>
          knex.into('blogPosts').where('id', 'ilike', escapeForLike(createdIds[0]))
            .update({
              active: false
            })
        )

        // Authenticate as the other author.
        .then(() =>
          BlogPost.read({
            auth: {
              emailAddress: otherAuthorEmailAddress,
              password
            },
            params: {
              postId: createdIds[0]
            }
          })
        )

        // Assert stuff.
        .then(post => {
          assert(!(post instanceof Array), 'An array was returned instead of a single post.')
          assert.strictEqual(post.title, searchablePosts[0].title, 'The wrong title was returned.')
          assert.strictEqual(post.body, searchablePosts[0].body, 'The wrong body was returned.')
          assert(searchablePosts[0].postedTime.isSame(post.postedTime), 'The wrong posted time was returned.')
          assert.strictEqual(post.active, false, 'The post was active.')
          assert.strictEqual(post.author.id, searchablePosts[0].author, 'The post did not have the right author.')
        })

        // Destroy the other author.
        .then(() =>
          knex
            .from('users')
            .where('id', otherAuthorId)
            .del()
        )
    })



    describe('search', () => {

      it('should be able to list posts', () => {
        return BlogPost.read({}).then(function (posts) {
          assert((posts instanceof Array), 'The result was not an array.')
        })
      })

      it('should return the proper contents', () => {
        return BlogPost.read({}).then(function (posts) {
          assert((posts instanceof Array), 'The result was not an array.')
          const exp = searchablePosts[0]
          assert.deepStrictEqual(posts[0], {
            id: exp.id,
            title: exp.title,
            body: exp.body,
            postedTime: exp.postedTime.valueOf(),
            timeZone,
            author: {
              id: authorId,
              givenName,
              familyName,
              active: true
            },
            active: true,
            preview: null
          }, 'The returned post was incorrect.')
        })
      })

      it('should see a post list that omits the contents of the inactive posts of others', () => {
        // Create the other author.
        let otherAuthorId
        const otherAuthorEmailAddress = 'a' + emailAddress
        return knex.into('users')
          .insert({
            emailAddress: otherAuthorEmailAddress,
            givenName,
            familyName,
            passwordHash,
            authorisedToBlog: true
          })
          .returning('id')
          .then(ids => {
            otherAuthorId = ids[0]
          })

          // Deactivate the post.
          .then(() =>
            knex
              .into('blogPosts')
              .where('id', 'ilike', escapeForLike(createdIds[0]))
              .update({
                active: false
              })
          )

          // Authenticate as the other author.
          .then(() =>
            BlogPost.read({
              auth: {
                emailAddress: otherAuthorEmailAddress,
                password
              }
            })
          )

          // Assert stuff.
          .then(posts => {
            assert.strictEqual(posts.length, searchablePosts.length, 'The list contains the wrong number of posts.')
            let activeCount = 0
            for (let i in posts) {
              const post = posts[i]
              if (post.active) {
                ++activeCount
              } else if (post.author.id !== otherAuthorId) {
                assert.strictEqual(post.title, undefined, 'The title was returned.')
                assert.strictEqual(post.body, undefined, 'The body was returned.')
                assert.strictEqual(post.preview, undefined, 'The preview was returned.')
                assert.strictEqual(post.postedTime, undefined, 'The posted time was returned.')
              }
              assert.strictEqual(post.author.id, authorId, 'The list contains posts by the wrong author.')
            }
            assert.strictEqual(activeCount, searchablePosts.length - 1, 'The wrong number of posts were active.')
          })

          // Destroy the other author.
          .then(() =>
            knex
              .from('users')
              .where('id', otherAuthorId)
              .del()
          )
      })

      it('should see a post list that includes the contents of the inactive posts of oneself', () => {
        // Deactivate the post.
        return knex.into('blogPosts').where('id', 'ilike', escapeForLike(createdIds[0]))
          .update({
            active: false
          }).then(() => {

            // Do the read.
            return BlogPost.read({
              auth: {
                emailAddress,
                password
              }
            })

          // Assert stuff.
          }).then(function (posts) {
            assert.strictEqual(posts.length, searchablePosts.length, 'The list contains the wrong number of posts.')
            let inactivePostEncountered = false
            for (let i in posts) {
              const post = posts[i]
              assert.strictEqual(post.author.id, authorId, 'The list contains posts by the wrong author.')
              if (!post.active) {
                if (post.id === createdIds[0]) {
                  inactivePostEncountered = true
                }
                assert.notStrictEqual(post.title, undefined, 'The title was omitted.')
                assert.notStrictEqual(post.body, undefined, 'The body was omitted.')
                assert.notStrictEqual(post.preview, undefined, 'The preview was omitted.')
                assert.notStrictEqual(post.postedTime, undefined, 'The posted time was omitted.')
              }
            }
            assert(inactivePostEncountered, 'The list did not contain the post that was deactivated.')
          })
      })

      it('should see a post list that includes the contents of the inactive posts of others as an admin', () => {
        // Create the other author.
        let otherAuthorId
        const otherAuthorEmailAddress = 'a' + emailAddress
        return knex.into('users')
          .insert({
            emailAddress: otherAuthorEmailAddress,
            givenName,
            familyName,
            passwordHash,
            authorisedToBlog: false,
            admin: true
          })
          .returning('id')
          .then(ids => {
            otherAuthorId = ids[0]
          })

          // Deactivate the post.
          .then(() =>
            knex
              .into('blogPosts')
              .where('id', 'ilike', escapeForLike(createdIds[0]))
              .update({
                active: false
              })
          )

          // Authenticate as the other author.
          .then(() =>
            BlogPost.read({
              auth: {
                emailAddress: otherAuthorEmailAddress,
                password
              }
            })
          )

          // Assert stuff.
          .then(posts => {
            assert.strictEqual(posts.length, searchablePosts.length, 'The list contains the wrong number of posts.')
            let inactivePostEncountered = false
            for (let i in posts) {
              const post = posts[i]
              assert.strictEqual(post.author.id, authorId, 'The list contains posts by the wrong author.')
              if (!post.active) {
                if (post.id === createdIds[0]) {
                  inactivePostEncountered = true
                }
                assert.notStrictEqual(post.title, undefined, 'The title was omitted.')
                assert.notStrictEqual(post.body, undefined, 'The body was omitted.')
                assert.notStrictEqual(post.preview, undefined, 'The preview was omitted.')
                assert.notStrictEqual(post.postedTime, undefined, 'The posted time was omitted.')
              }
            }
            assert(inactivePostEncountered, 'The list did not contain the post that was deactivated.')
          })

          // Destroy the other author.
          .then(() =>
            knex
              .from('users')
              .where('id', otherAuthorId)
              .del()
          )
      })
    })
  })

  describe('update', () => {

    beforeEach('Create the post to be updated.', () => {
      return knex.into('blogPosts').insert({
        id: id,
        title: title,
        body: body,
        postedTime: postedTime,
        author: authorId
      })
      .returning('id')
      .then(function (returnedIds) {
        createdIds.push(returnedIds[0])
      })
    })

    it('should fail without auth', () => {
      return BlogPost.update({
        params: {
          postId: createdIds[0]
        }
      })
      .then(function (post) {
        assert(false, 'The update succeeded.')
      })
      .catch(err => {
        if (err instanceof AuthorisationError) {
        } else {
          throw err
        }
      })
    })

    it('should fail if the user is not authorised to blog', () => {
      return knex.from('users').where('id', authorId).update({
        authorisedToBlog: false
      }).then(() => {
        return BlogPost.update({
          auth: {
            emailAddress,
            password
          }
        })
      })
      .then(function (post) {
        assert(false, 'The update succeeded.')
      })
      .catch(err => {
        if (err instanceof AuthorisationError) {
        } else {
          throw err
        }
      })
    })

    it('should fail if the post does not exist', () => {
      return BlogPost.update({
        auth: {
          emailAddress,
          password
        },
        params: {
          postId: createdIds[0] + 1
        }
      })
      .then(function (post) {
        assert(false, 'The update succeeded.')
      })
      .catch(err => {
        if (err instanceof NoSuchResourceError) {
        } else {
          throw err
        }
      })
    })

    it('should be able to change the id', () => {
      return BlogPost.update({
        auth: {
          emailAddress,
          password
        },
        params: {
          postId: createdIds[0]
        },
        body: {
          id: id + 'a'
        }
      })
      .then(function (post) {
        createdIds[0] = post.id
        assert.strictEqual(post.id, id + 'a', 'The id was not modified correctly.')
      })
    })

    it('should be able to set the existing id', () => {
      return BlogPost.update({
        auth: {
          emailAddress,
          password
        },
        params: {
          postId: createdIds[0]
        },
        body: {
          id: id
        }
      })
      .then(function (post) {
        createdIds[0] = post.id
        assert.strictEqual(post.id, id, 'The id was not modified correctly.')
      })
    })

    it('should fail to remove the id', () => {
      return BlogPost.update({
        auth: {
          emailAddress,
          password
        },
        params: {
          postId: createdIds[0]
        },
        body: {
          id: null
        }
      })
      .then(function (post) {
        assert(false, 'The id was removed.')
      })
      .catch(err => {
        if (err instanceof ValidationError) {
          if (Object.keys(err.messages).length !== 1
            || !err.messages.id
            || err.messages.id.length !== 1) {
            throw err
          }
        } else {
          throw err
        }
      })
    })

    it('should fail to set a conflicting id', () => {
      return knex
        .into('blogPosts')
        .insert({
          id: id + 'a',
          title: title,
          body: body,
          author: authorId
        }).returning('id')
        .then(function (ids) {
          createdIds.push(ids[0])
          return BlogPost.update({
            auth: {
              emailAddress,
              password
            },
            params: {
              postId: createdIds[1]
            },
            body: {
              id: createdIds[0]
            }
          })
        })
        .then(function (post) {
          assert(false, 'The id was set.')
        })
        .catch(err => {
          if (err instanceof ConflictingEditError) {
          } else {
            throw err
          }
        })
    })

    it('should fail to set an id that does not start with a date', () => {
      return BlogPost.update({
        auth: {
          emailAddress,
          password
        },
        params: {
          postId: createdIds[0]
        },
        body: {
          id: 'This_id_does_not_start_with_a_date'
        }
      })
      .then(function (post) {
        assert(false, 'The id was set.')
      })
      .catch(err => {
        if (err instanceof MalformedRequestError) {
        } else {
          throw err
        }
      })
    })

    it('should be able to change the body', () => {
      return BlogPost.update({
        auth: {
          emailAddress,
          password
        },
        params: {
          postId: createdIds[0]
        },
        body: {
          body: body + 'a'
        }
      })
      .then(function (post) {
        assert.strictEqual(post.body, body + 'a', 'The body was not modified correctly.')
      })
    })

    it('should fail to remove the body', () => {
      return BlogPost.update({
        auth: {
          emailAddress,
          password
        },
        params: {
          postId: createdIds[0]
        },
        body: {
          body: null
        }
      })
      .then(function (post) {
        assert(false, 'The body was removed.')
      })
      .catch(err => {
        if (err instanceof ValidationError) {
          if (Object.keys(err.messages).length !== 1
            || !err.messages.body
            || err.messages.body.length !== 1) {
            throw err
          }
        } else {
          throw err
        }
      })
    })

    it('should be able to change the title', () => {
      return BlogPost.update({
        auth: {
          emailAddress,
          password
        },
        params: {
          postId: createdIds[0]
        },
        body: {
          title: title + 'a'
        }
      })
      .then(function (post) {
        assert.strictEqual(post.title, title + 'a', 'The title was not modified correctly.')
      })
    })

    it('should fail to remove the title', () => {
      return BlogPost.update({
        auth: {
          emailAddress,
          password
        },
        params: {
          postId: createdIds[0]
        },
        body: {
          title: null
        }
      })
      .then(function (post) {
        assert(false, 'The title was removed.')
      })
      .catch(err => {
        if (err instanceof ValidationError) {
          if (Object.keys(err.messages).length !== 1
            || !err.messages.title
            || err.messages.title.length !== 1) {
            throw err
          }
        } else {
          throw err
        }
      })
    })

    it('should be able to change the preview', () => {
      return BlogPost.update({
        auth: {
          emailAddress,
          password
        },
        params: {
          postId: createdIds[0]
        },
        body: {
          preview: preview + 'a'
        }
      })
      .then(function (post) {
        assert.strictEqual(post.preview, preview + 'a', 'The preview was not modified correctly.')
      })
    })

    it('should be able to remove the preview', () => {
      return BlogPost.update({
        auth: {
          emailAddress,
          password
        },
        params: {
          postId: createdIds[0]
        },
        body: {
          preview: null
        }
      })
      .then(function (post) {
        assert.strictEqual(post.preview, null, 'The preview was not removed.')
      })
    })

    it('should be able to change the posted time', () => {
      const modifiedPostedTime = postedTime.clone().add(1, 'day')
      return BlogPost.update({
        auth: {
          emailAddress,
          password
        },
        params: {
          postId: createdIds[0]
        },
        body: {
          postedTime: modifiedPostedTime
        }
      })
      .then(function (post) {
        assert(modifiedPostedTime.isSame(post.postedTime), 'The wrong posted time was returned.')
      })
    })

    it('should be able to set the posted time to a number string', () => {
      const modifiedPostedTime = postedTime.clone().add(1, 'day')
      return BlogPost.update({
        auth: {
          emailAddress,
          password
        },
        params: {
          postId: createdIds[0]
        },
        body: {
          postedTime: modifiedPostedTime
        }
      })
      .then(function (post) {
        assert(modifiedPostedTime.isSame(post.postedTime), 'The wrong posted time was returned.')
      })
    })

    it('should fail to remove the posted time', () => {
      return BlogPost.update({
        auth: {
          emailAddress,
          password
        },
        params: {
          postId: createdIds[0]
        },
        body: {
          postedTime: null
        }
      })
      .then(function (post) {
        assert(false, 'The postedTime was removed.')
      })
      .catch(err => {
        if (err instanceof ValidationError) {
          if (Object.keys(err.messages).length !== 1
            || !err.messages.postedTime
            || err.messages.postedTime.length !== 1) {
            throw err
          }
        } else {
          throw err
        }
      })
    })

    it('should fail to set the posted time to a formatted date string', () => {
      const dateString = postedTime.toString()
      return BlogPost.update({
        auth: {
          emailAddress,
          password
        },
        params: {
          postId: createdIds[0]
        },
        body: {
          postedTime: dateString
        }
      })
      .then(function (post) {
        assert(false, 'The postedTime was set to ' + post.postedTime + '.')
      })
      .catch(err => {
        if (err instanceof ValidationError) {
          if (Object.keys(err.messages).length !== 1
            || !err.messages.postedTime
            || err.messages.postedTime.length !== 1) {
            throw err
          }
        } else {
          throw err
        }
      })
    })

    it('should be able to set active', () => {
      return knex
        .into('blogPosts')
        .where('id', 'ilike', escapeForLike(id))
        .update({
          active: false
        })
        .then(() => {
          return BlogPost.update({
            auth: {
              emailAddress,
              password
            },
            params: {
              postId: createdIds[0]
            },
            body: {
              active: true
            }
          })
        })
        .then(function (post) {
          assert.strictEqual(post.active, true, 'The active attribute was not modified correctly.')
        })
    })

    it('should be able to set inactive', () => {
      return BlogPost.update({
        auth: {
          emailAddress,
          password
        },
        params: {
          postId: createdIds[0]
        },
        body: {
          active: false
        }
      })
      .then(function (post) {
        assert.strictEqual(post.active, false, 'The active attribute was not modified correctly.')
      })
    })

    it('should fail to set the author to someone else', () => {
      let otherAuthorId
      return knex
        .into('users')
        .insert({
          emailAddress: 'a' + emailAddress,
          passwordHash,
          authorisedToBlog: true
        })
        .returning('id')
        .then(ids => {
          otherAuthorId = ids[0]
          return BlogPost.update({
            auth: {
              emailAddress,
              password
            },
            params: {
              postId: createdIds[0]
            },
            body: {
              author: {
                id: otherAuthorId
              }
            }
          })
        })
        .then(post => {
          assert(false, 'The author was reassigned.')
        })
        .catch(err => {
          if (!(err instanceof ValidationError)
            || Object.keys(err.messages).length !== 1
            || !err.messages.author
            || Object.keys(err.messages.author).length !== 1
            || !err.messages.author.id
            || err.messages.author.id.length !== 1) {
            throw err
          }
        })
        .then(() =>
          knex
            .from('users')
            .where('id', otherAuthorId)
            .del()
        )
    })

    it('should be able to set the author to the existing author', () => {
      return BlogPost.update({
        auth: {
          emailAddress,
          password
        },
        params: {
          postId: createdIds[0]
        },
        body: {
          author: {
            id: authorId
          }
        }
      }).then(function (post) {
        assert.strictEqual(post.author.id, authorId, 'The author was assigned incorrectly.')
      })
    })

    it('should be able to set the author to someone else as an admin', () => {
      let otherAuthorId
      return knex
        .into('users')
        .insert({
          emailAddress: 'a' + emailAddress,
          passwordHash,
          admin: true
        })
        .returning('id')
        .then(function (ids) {
          otherAuthorId = ids[0]
          return BlogPost.update({
            auth: {
              emailAddress: 'a' + emailAddress,
              password
            },
            params: {
              postId: createdIds[0]
            },
            body: {
              author: {
                id: otherAuthorId
              }
            }
          })
        })
        .then(function (post) {
          assert.strictEqual(post.author.id, otherAuthorId, 'The author was assigned incorrectly.')
        })
        .catch(err => {
          if (err instanceof AuthenticationError) {
          } else {
            throw err
          }
        })
        .then(() => {
          // Change the author of the post back so that we can delete the other author.
          return knex
            .into('blogPosts')
            .where('id', createdIds[0])
            .update({
              author: authorId
            }).then(() => {
              return knex
                .from('users')
                .where('id', otherAuthorId)
                .del()
            })
        })
    })

    it('should fail to set the author without an id', () => {
      return BlogPost.update({
        auth: {
          emailAddress,
          password
        },
        params: {
          postId: createdIds[0]
        },
        body: {
          author: {}
        }
      })
      .then(function (post) {
        assert(false, 'The author was reassigned.')
      })
      .catch(err => {
        if (err instanceof ValidationError) {
          if (Object.keys(err.messages).length !== 1
            || !err.messages.author
            || Object.keys(err.messages.author).length !== 1
            || !err.messages.author.id
            || err.messages.author.id.length !== 1) {
            throw err
          }
        } else {
          throw err
        }
      })
    })

    it('should fail with someone else\'s auth', () => {
      let otherAuthorId
      return knex
        .into('users')
        .insert({
          emailAddress: 'a' + emailAddress,
          passwordHash,
          authorisedToBlog: true
        })
        .returning('id')
        .then(function (ids) {
          otherAuthorId = ids[0]
          return BlogPost.update({
            auth: {
              emailAddress: 'a' + emailAddress,
              password
            },
            params: {
              postId: createdIds[0]
            },
            body: {
              body: body + 'a'
            }
          })
        })
        .then(function (post) {
          assert(false, 'The update succeeded.')
        })
        .catch(err => {
          if (err instanceof AuthorisationError) {
          } else {
            throw err
          }
        })
        .then(() => {
          return knex
            .from('users')
            .where('id', otherAuthorId)
            .del()
        })
    })

  })

  describe('delete', () => {

    beforeEach('Create the post to be deleted.', () => {
      return knex.into('blogPosts').insert({
        id: id,
        title: title,
        body: body,
        postedTime: postedTime,
        author: authorId
      })
      .returning('id')
      .then(function (returnedIds) {
        createdIds.push(returnedIds[0])
      })
    })

    it('should work in the happy case', () => {
      return BlogPost.delete({
        auth: {
          emailAddress,
          password
        },
        params: {
          postId: createdIds[0]
        }
      })
      .then(() => {
        return knex
          .from('blogPosts')
          .select('id')
          .where('id', 'ilike', escapeForLike(id))
      })
      .then(function (posts) {
        assert.strictEqual(posts.length, 0, 'The post was not deleted.')
      })
    })

    it('should fail when the post does not exist', () => {
      return BlogPost.delete({
        auth: {
          emailAddress,
          password
        },
        params: {
          postId: createdIds[0] + 1
        }
      })
      .then(() => {
        return knex
          .from('blogPosts')
          .select('id')
          .where('id', 'ilike', escapeForLike(id))
      })
      .then(function (posts) {
        assert(false, 'The post was deleted.')
      })
      .catch(err => {
        if (err instanceof NoSuchResourceError) {
        } else {
          throw err
        }
      })
    })

    it('should fail with someone else\'s auth', () => {
      let otherAuthorId
      return knex
        .into('users')
        .insert({
          emailAddress: 'a' + emailAddress,
          passwordHash,
          authorisedToBlog: true
        })
        .returning('id')
        .then(function (ids) {
          otherAuthorId = ids[0]
          return BlogPost.delete({
            auth: {
              emailAddress: 'a' + emailAddress,
              password
            },
            params: {
              postId: createdIds[0]
            }
          })
        })
        .then(function (post) {
          assert(false, 'The deletion succeeded.')
        })
        .catch(err => {
          if (err instanceof AuthorisationError) {
          } else {
            throw err
          }
        })
        .then(() => {
          return knex
            .from('users')
            .where('id', otherAuthorId)
            .del()
        })
    })

    it('should fail with no auth', () => {
      return BlogPost.delete({
        params: {
          postId: createdIds[0]
        }
      })
      .then(function (post) {
        assert(false, 'The deletion succeeded.')
      })
      .catch(err => {
        if (err instanceof AuthorisationError) {
        } else {
          throw err
        }
      })
    })

    it('should fail with an unauthorised user', () => {
      return knex
        .into('users')
        .where('id', authorId)
        .update({
          authorisedToBlog: false
        })
        .then(() => {
          return BlogPost.delete({
            auth: {
              emailAddress,
              password
            },
            params: {
              postId: createdIds[0]
            }
          })
        })
        .then(function (post) {
          assert(false, 'The deletion succeeded.')
        })
        .catch(err => {
          if (err instanceof AuthorisationError) {
          } else {
            throw err
          }
        })
    })

  })

})
