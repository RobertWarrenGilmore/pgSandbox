'use strict'
const assert = require('assert')
const Promise = require('bluebird')
const knex = require('../../../api/database/knex')
const escapeForLike = require('../../../api/biz/utilities/escapeForLike')
const bcrypt = Promise.promisifyAll(require('bcryptjs'))
const BlogPost = require('../../../api/biz/blogPosts')(knex)
const AuthenticationError = require('../../../api/errors/authenticationError')
const AuthorisationError = require('../../../api/errors/authorisationError')
const MalformedRequestError = require('../../../api/errors/malformedRequestError')
const ConflictingEditError = require('../../../api/errors/conflictingEditError')
const NoSuchResourceError = require('../../../api/errors/noSuchResourceError')
const validate = require('../../../utilities/validate')
const { ValidationError } = validate
const moment = require('moment-timezone')

describe('blog posts', function () {
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

  beforeEach('Create an author.', function () {
    return knex.into('users').insert({
      emailAddress: emailAddress,
      givenName: givenName,
      familyName: familyName,
      passwordHash: passwordHash,
      authorisedToBlog: true
    }).returning('id').then(function (ids) {
      authorId = ids[0]
    })
  })

  afterEach('Delete any created test posts.', function () {
    return Promise.all(createdIds.map(function (deletionId) {
      return knex
        .from('blogPosts')
        .where('id', 'ilike', escapeForLike(deletionId))
        .del()
    })).then(function () {
      createdIds.length = 0
    })
  })

  afterEach('Destroy the author.', function () {
    return knex
      .from('users')
      .where('id', authorId)
      .del()
  })

  describe('create', function () {

    it('should work with good auth and minimal attributes', function () {
      return BlogPost.create({
        auth: {
          emailAddress: emailAddress,
          password: password
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
      }).then(function (post) {
        return knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id))
      }).then(function (posts) {
        createdIds.push(posts[0].id)
        assert(posts[0], 'No post was created.')
      })
    })

    it('should work with good auth and all attributes', function () {
      return BlogPost.create({
        auth: {
          emailAddress: emailAddress,
          password: password
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
      }).then(function (post) {
        return knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id))
      }).then(function (posts) {
        createdIds.push(id)
        assert(posts[0], 'No post was created.')
      })
    })

    it('should return the proper contents', function () {
      return BlogPost.create({
        auth: {
          emailAddress: emailAddress,
          password: password
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
      }).then(function (post) {
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
            givenName: givenName,
            familyName: familyName,
            active: true
          },
          active: true,
          preview: preview
        }, 'The returned post was incorrect.')
      })
    })

    it('should fail with bad auth and minimal attributes', function () {
      return BlogPost.create({
        auth: {
          emailAddress: emailAddress,
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
      }).then(function (post) {
        return knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id))
      }).then(function (posts) {
        createdIds.push(posts[0].id)
        assert(false, 'The creation succeeded.')
      }).catch(AuthenticationError, function () {})
    })

    it('should fail with no auth and minimal attributes', function () {
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
      }).then(function (post) {
        return knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id))
      }).then(function (posts) {
        createdIds.push(posts[0].id)
        assert(false, 'The creation succeeded.')
      }).catch(AuthorisationError, function () {})
    })

    it('should fail with a poorly formatted post id', function () {
      return BlogPost.create({
        auth: {
          emailAddress: emailAddress,
          password: password
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
      }).then(function (post) {
        return knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id))
      }).then(function (posts) {
        createdIds.push(posts[0].id)
        assert(false, 'The creation succeeded.')
      }).catch(ValidationError, function (err) {
        if (Object.keys(err.messages).length !== 1
          || !err.messages.postId
          || err.messages.postId.length !== 1) {
          throw err
        }
      })
    })

    it('should fail with a poorly formatted posted time', function () {
      return BlogPost.create({
        auth: {
          emailAddress: emailAddress,
          password: password
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
      }).then(function (post) {
        return knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id))
      }).then(function (posts) {
        createdIds.push(posts[0].id)
        assert(false, 'The creation succeeded.')
      }).catch(ValidationError, function (err) {
        if (Object.keys(err.messages).length !== 1
          || !err.messages.postedTime
          || err.messages.postedTime.length !== 1) {
          throw err
        }
      })
    })

    it('should fail with a poorly formatted time zone', function () {
      return BlogPost.create({
        auth: {
          emailAddress: emailAddress,
          password: password
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
      }).then(function (post) {
        return knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id))
      }).then(function (posts) {
        createdIds.push(posts[0].id)
        assert(false, 'The creation succeeded.')
      }).catch(ValidationError, function (err) {
        if (Object.keys(err.messages).length !== 1
          || !err.messages.timeZone
          || err.messages.timeZone.length !== 1) {
          throw err
        }
      })
    })

    it('should reject silly attributes', function () {
      return BlogPost.create({
        auth: {
          emailAddress: emailAddress,
          password: password
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
      }).then(function (post) {
        return knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id))
      }).then(function (posts) {
        createdIds.push(posts[0].id)
        assert(false, 'The creation succeeded.')
      }).catch(ValidationError, function (err) {
        if (Object.keys(err.messages).length !== 1
          || !err.messages.silly
          || err.messages.silly.length !== 1) {
          throw err
        }
      })
    })

    it('should fail if the id is not unique', function () {
      return knex.into('blogPosts').insert({
        id: id,
        title: title,
        body: body,
        postedTime: postedTime,
        author: authorId
      }).then(function () {
        createdIds.push(id)
        return BlogPost.create({
          auth: {
            emailAddress: emailAddress,
            password: password
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
      }).then(function (post) {
        return knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id))
      }).then(function (posts) {
        createdIds.push(posts[0].id)
        assert(false, 'The creation succeeded.')
      }).catch(ConflictingEditError, function () {})
    })

    it('should fail if the id is omitted', function () {
      return BlogPost.create({
        auth: {
          emailAddress: emailAddress,
          password: password
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
      }).catch(ValidationError, function (err) {
        if (Object.keys(err.messages).length !== 1
          || !err.messages.postId
          || err.messages.postId.length !== 1) {
          throw err
        }
      })
    })

    it('should fail if the body is omitted', function () {
      return BlogPost.create({
        auth: {
          emailAddress: emailAddress,
          password: password
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
      }).then(function (post) {
        return knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id))
      }).then(function (posts) {
        createdIds.push(posts[0].id)
        assert(false, 'The creation succeeded.')
      }).catch(ValidationError, function (err) {
        if (Object.keys(err.messages).length !== 1
          || !err.messages.body
          || err.messages.body.length !== 1) {
          throw err
        }
      })
    })

    it('should fail if the title is omitted', function () {
      return BlogPost.create({
        auth: {
          emailAddress: emailAddress,
          password: password
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
      }).then(function (post) {
        return knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id))
      }).then(function (posts) {
        createdIds.push(posts[0].id)
        assert(false, 'The creation succeeded.')
      }).catch(ValidationError, function (err) {
        if (Object.keys(err.messages).length !== 1
          || !err.messages.title
          || err.messages.title.length !== 1) {
          throw err
        }
      })
    })

    it('should fail if the postedTime is omitted', function () {
      return BlogPost.create({
        auth: {
          emailAddress: emailAddress,
          password: password
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
      }).then(function (post) {
        return knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id))
      }).then(function (posts) {
        createdIds.push(posts[0].id)
        assert(false, 'The creation succeeded.')
      }).catch(ValidationError, function (err) {
        if (Object.keys(err.messages).length !== 1
          || !err.messages.postedTime
          || err.messages.postedTime.length !== 1) {
          throw err
        }
      })
    })

    it('should fail if the timeZone is omitted', function () {
      return BlogPost.create({
        auth: {
          emailAddress: emailAddress,
          password: password
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
      }).then(function (post) {
        return knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id))
      }).then(function (posts) {
        createdIds.push(posts[0].id)
        assert(false, 'The creation succeeded.')
      }).catch(ValidationError, function (err) {
        if (Object.keys(err.messages).length !== 1
          || !err.messages.timeZone
          || err.messages.timeZone.length !== 1) {
          throw err
        }
      })
    })

    it('should fail if the author is omitted', function () {
      return BlogPost.create({
        auth: {
          emailAddress: emailAddress,
          password: password
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
      }).then(function (post) {
        return knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id))
      }).then(function (posts) {
        createdIds.push(posts[0].id)
        assert(false, 'The creation succeeded.')
      }).catch(ValidationError, function (err) {
        if (Object.keys(err.messages).length !== 1
          || !err.messages.author
          || err.messages.author.length !== 1) {
          throw err
        }
      })
    })

    it('should fail if the author\'s id is omitted', function () {
      return BlogPost.create({
        auth: {
          emailAddress: emailAddress,
          password: password
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
      }).then(function (post) {
        return knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id))
      }).then(function (posts) {
        createdIds.push(posts[0].id)
        assert(false, 'The creation succeeded.')
      }).catch(ValidationError, function (err) {
        if (Object.keys(err.messages).length !== 1
          || !err.messages.author
          || Object.keys(err.messages.author).length !== 1
          || err.messages.author.id.length !== 1) {
          throw err
        }
      })
    })

    it('should fail if the author\'s givenName is included', function () {
      return BlogPost.create({
        auth: {
          emailAddress: emailAddress,
          password: password
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
      }).then(function (post) {
        return knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id))
      }).then(function (posts) {
        createdIds.push(posts[0].id)
        assert(false, 'The creation succeeded.')
      }).catch(ValidationError, function (err) {
        if (Object.keys(err.messages).length !== 1
          || !err.messages.author
          || Object.keys(err.messages.author).length !== 1
          || err.messages.author.givenName.length !== 1) {
          throw err
        }
      })
    })

    it('should fail if the author is not a user', function () {
      return BlogPost.create({
        auth: {
          emailAddress: emailAddress,
          password: password
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
      }).then(function (post) {
        return knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id))
      }).then(function (posts) {
        createdIds.push(posts[0].id)
        assert(false, 'The creation succeeded.')
      }).catch(ValidationError, function (err) {
        if (Object.keys(err.messages).length !== 1
          || !err.messages.author
          || Object.keys(err.messages.author).length !== 1
          || err.messages.author.id.length !== 1) {
          throw err
        }
      })
    })

    it('should fail if the author is not the authenticated user', function () {
      let otherAuthorId
      const otherAuthorEmailAddress = 'a' + emailAddress
      return knex.into('users')
        .insert({
          emailAddress: otherAuthorEmailAddress,
          givenName: givenName,
          familyName: familyName,
          passwordHash: passwordHash,
          authorisedToBlog: true
        }).returning('id').then(function (ids) {
          otherAuthorId = ids[0]
        }).then(function () {
          return BlogPost.create({
            auth: {
              emailAddress: emailAddress,
              password: password
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
        }).then(function (post) {
          return knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id))
        }).then(function (posts) {
          createdIds.push(posts[0].id)
          assert(false, 'The creation succeeded.')
        }).catch(ValidationError, function (err) {
          if (Object.keys(err.messages).length !== 1
            || !err.messages.author
            || Object.keys(err.messages.author).length !== 1
            || err.messages.author.id.length !== 1) {
            throw err
          }
        }).finally(function () {
          return knex
            .from('users')
            .where('id', otherAuthorId)
            .del()
        })

    })

    it('should fail if the user is not authorised to blog', function () {
      return knex.from('users').where('id', authorId).update({
        authorisedToBlog: false
      }).then(function () {
        return BlogPost.create({
          auth: {
            emailAddress: emailAddress,
            password: password
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
      }).then(function (post) {
        return knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id))
      }).then(function (posts) {
        createdIds.push(posts[0].id)
        assert(false, 'The creation succeeded.')
      }).catch(AuthorisationError, function () {})
    })

  })

  describe('read', function () {

    let searchablePosts

    beforeEach('Create the searchable posts.', function () {
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

    it('should be able to look up by postId', function () {
      return BlogPost.read({
        params: {
          postId: createdIds[0]
        }
      }).then(function (post) {
        assert(!(post instanceof Array), 'An array was returned instead of a single post.')
        assert(!!post.id, 'The returned post had no id.')
      })
    })

    it('should return the proper contents', function () {
      return BlogPost.read({
        params: {
          postId: createdIds[0]
        }
      }).then(function (post) {
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
            givenName: givenName,
            familyName: familyName,
            active: true
          },
          active: true,
          preview: null
        }, 'The returned post was incorrect.')
      })
    })

    it('should fail to look up a non-existent post', function () {
      return BlogPost.read({
        params: {
          postId: createdIds[createdIds.length] + 'a'
        }
      }).then(function (post) {
        assert(false, 'The read succeeded')
      }).catch(NoSuchResourceError, function () {})
    })

    it('should fail to look up the contents of an inactive post without authenticating', function () {
      return knex.into('blogPosts').where('id', 'ilike', escapeForLike(createdIds[0]))
        .update({
          active: false
        }).then(function () {
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

    it('should fail to look up the contents of an inactive post that belongs to someone else', function () {

      // Create the other author.
      let otherAuthorId
      const otherAuthorEmailAddress = 'a' + emailAddress
      return knex.into('users')
        .insert({
          emailAddress: otherAuthorEmailAddress,
          givenName: givenName,
          familyName: familyName,
          passwordHash: passwordHash,
          authorisedToBlog: true
        }).returning('id').then(function (ids) {
          otherAuthorId = ids[0]
        }).then(function () {

          // Deactivate the post.
          return knex.into('blogPosts').where('id', 'ilike', escapeForLike(createdIds[0]))
            .update({
              active: false
            })
        }).then(function () {

          // Authenticate as the other author.
          return BlogPost.read({
            auth: {
              emailAddress: otherAuthorEmailAddress,
              password: password
            },
            params: {
              postId: createdIds[0]
            }
          })

        // Assert stuff.
        }).then(function (post) {
          assert.strictEqual(post.title, undefined, 'The title was returned.')
          assert.strictEqual(post.body, undefined, 'The body was returned.')
          assert.strictEqual(post.preview, undefined, 'The preview was returned.')
          assert.strictEqual(post.postedTime, undefined, 'The posted time was returned.')
          assert.strictEqual(post.active, false, 'The post was active.')
          assert.strictEqual(post.author.id, authorId, 'The post did not have the right author.')
        }).finally(function () {

          // Destroy the other author.
          return knex
            .from('users')
            .where('id', otherAuthorId)
            .del()
        })
    })

    it('should be able to look up the contents of an inactive post that belongs to oneself', function () {
      return knex.into('blogPosts').where('id', 'ilike', escapeForLike(createdIds[0]))
        .update({
          active: false
        }).then(function () {
          return BlogPost.read({
            auth: {
              emailAddress: emailAddress,
              password: password
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

    it('should be able to look up the contents of an inactive post of another user as an admin', function () {

      // Create the other author.
      let otherAuthorId
      const otherAuthorEmailAddress = 'a' + emailAddress
      return knex.into('users')
        .insert({
          emailAddress: otherAuthorEmailAddress,
          givenName: givenName,
          familyName: familyName,
          passwordHash: passwordHash,
          authorisedToBlog: false,
          admin: true
        }).returning('id').then(function (ids) {
          otherAuthorId = ids[0]
        }).then(function () {

          // Deactivate the post.
          return knex.into('blogPosts').where('id', 'ilike', escapeForLike(createdIds[0]))
            .update({
              active: false
            })
        }).then(function () {

          // Authenticate as the other author.
          return BlogPost.read({
            auth: {
              emailAddress: otherAuthorEmailAddress,
              password: password
            },
            params: {
              postId: createdIds[0]
            }
          })

        // Assert stuff.
        }).then(function (post) {
          assert(!(post instanceof Array), 'An array was returned instead of a single post.')
          assert.strictEqual(post.title, searchablePosts[0].title, 'The wrong title was returned.')
          assert.strictEqual(post.body, searchablePosts[0].body, 'The wrong body was returned.')
          assert(searchablePosts[0].postedTime.isSame(post.postedTime), 'The wrong posted time was returned.')
          assert.strictEqual(post.active, false, 'The post was active.')
          assert.strictEqual(post.author.id, searchablePosts[0].author, 'The post did not have the right author.')
        }).finally(function () {

          // Destroy the other author.
          return knex
            .from('users')
            .where('id', otherAuthorId)
            .del()
        })
    })



    describe('search', function () {

      it('should be able to list posts', function () {
        return BlogPost.read({}).then(function (posts) {
          assert((posts instanceof Array), 'The result was not an array.')
        })
      })

      it('should return the proper contents', function () {
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
              givenName: givenName,
              familyName: familyName,
              active: true
            },
            active: true,
            preview: null
          }, 'The returned post was incorrect.')
        })
      })

      it('should see a post list that omits the contents of the inactive posts of others', function () {
        // Create the other author.
        let otherAuthorId
        const otherAuthorEmailAddress = 'a' + emailAddress
        return knex.into('users')
          .insert({
            emailAddress: otherAuthorEmailAddress,
            givenName: givenName,
            familyName: familyName,
            passwordHash: passwordHash,
            authorisedToBlog: true
          }).returning('id').then(function (ids) {
            otherAuthorId = ids[0]
          }).then(function () {

            // Deactivate the post.
            return knex.into('blogPosts').where('id', 'ilike', escapeForLike(createdIds[0]))
              .update({
                active: false
              })
          }).then(function () {

            // Authenticate as the other author.
            return BlogPost.read({
              auth: {
                emailAddress: otherAuthorEmailAddress,
                password: password
              }
            })

          // Assert stuff.
          }).then(function (posts) {
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
          }).finally(function () {

            // Destroy the other author.
            return knex
              .from('users')
              .where('id', otherAuthorId)
              .del()
          })
      })

      it('should see a post list that includes the contents of the inactive posts of oneself', function () {
        // Deactivate the post.
        return knex.into('blogPosts').where('id', 'ilike', escapeForLike(createdIds[0]))
          .update({
            active: false
          }).then(function () {

            // Do the read.
            return BlogPost.read({
              auth: {
                emailAddress: emailAddress,
                password: password
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

      it('should see a post list that includes the contents of the inactive posts of others as an admin', function () {
        // Create the other author.
        let otherAuthorId
        const otherAuthorEmailAddress = 'a' + emailAddress
        return knex.into('users')
          .insert({
            emailAddress: otherAuthorEmailAddress,
            givenName: givenName,
            familyName: familyName,
            passwordHash: passwordHash,
            authorisedToBlog: false,
            admin: true
          }).returning('id').then(function (ids) {
            otherAuthorId = ids[0]
          }).then(function () {

            // Deactivate the post.
            return knex.into('blogPosts').where('id', 'ilike', escapeForLike(createdIds[0]))
              .update({
                active: false
              })
          }).then(function () {

            // Authenticate as the other author.
            return BlogPost.read({
              auth: {
                emailAddress: otherAuthorEmailAddress,
                password: password
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
          }).finally(function () {

            // Destroy the other author.
            return knex
              .from('users')
              .where('id', otherAuthorId)
              .del()
          })
      })
    })
  })

  describe('update', function () {

    beforeEach('Create the post to be updated.', function () {
      return knex.into('blogPosts').insert({
        id: id,
        title: title,
        body: body,
        postedTime: postedTime,
        author: authorId
      }).returning('id')
        .then(function (returnedIds) {
          createdIds.push(returnedIds[0])
        })
    })

    it('should fail without auth', function () {
      return BlogPost.update({
        params: {
          postId: createdIds[0]
        }
      }).then(function (post) {
        assert(false, 'The update succeeded.')
      }).catch(AuthorisationError, function () {})
    })

    it('should fail if the user is not authorised to blog', function () {
      return knex.from('users').where('id', authorId).update({
        authorisedToBlog: false
      }).then(function () {
        return BlogPost.update({
          auth: {
            emailAddress: emailAddress,
            password: password
          }
        })
      }).then(function (post) {
        assert(false, 'The update succeeded.')
      }).catch(AuthorisationError, function () {})
    })

    it('should fail if the post does not exist', function () {
      return BlogPost.update({
        auth: {
          emailAddress: emailAddress,
          password: password
        },
        params: {
          postId: createdIds[0] + 1
        }
      }).then(function (post) {
        assert(false, 'The update succeeded.')
      }).catch(NoSuchResourceError, function () {})
    })

    it('should be able to change the id', function () {
      return BlogPost.update({
        auth: {
          emailAddress: emailAddress,
          password: password
        },
        params: {
          postId: createdIds[0]
        },
        body: {
          id: id + 'a'
        }
      }).then(function (post) {
        createdIds[0] = post.id
        assert.strictEqual(post.id, id + 'a', 'The id was not modified correctly.')
      })
    })

    it('should be able to set the existing id', function () {
      return BlogPost.update({
        auth: {
          emailAddress: emailAddress,
          password: password
        },
        params: {
          postId: createdIds[0]
        },
        body: {
          id: id
        }
      }).then(function (post) {
        createdIds[0] = post.id
        assert.strictEqual(post.id, id, 'The id was not modified correctly.')
      })
    })

    it('should fail to remove the id', function () {
      return BlogPost.update({
        auth: {
          emailAddress: emailAddress,
          password: password
        },
        params: {
          postId: createdIds[0]
        },
        body: {
          id: null
        }
      }).then(function (post) {
        assert(false, 'The id was removed.')
      }).catch(ValidationError, function (err) {
        if (Object.keys(err.messages).length !== 1
          || !err.messages.id
          || err.messages.id.length !== 1) {
          throw err
        }
      })
    })

    it('should fail to set a conflicting id', function () {
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
              emailAddress: emailAddress,
              password: password
            },
            params: {
              postId: createdIds[1]
            },
            body: {
              id: createdIds[0]
            }
          })
        }).then(function (post) {
          assert(false, 'The id was set.')
        }).catch(ConflictingEditError, function () {})
    })

    it('should fail to set an id that does not start with a date', function () {
      return BlogPost.update({
        auth: {
          emailAddress: emailAddress,
          password: password
        },
        params: {
          postId: createdIds[0]
        },
        body: {
          id: 'This_id_does_not_start_with_a_date'
        }
      }).then(function (post) {
        assert(false, 'The id was set.')
      }).catch(MalformedRequestError, function () {})
    })

    it('should be able to change the body', function () {
      return BlogPost.update({
        auth: {
          emailAddress: emailAddress,
          password: password
        },
        params: {
          postId: createdIds[0]
        },
        body: {
          body: body + 'a'
        }
      }).then(function (post) {
        assert.strictEqual(post.body, body + 'a', 'The body was not modified correctly.')
      })
    })

    it('should fail to remove the body', function () {
      return BlogPost.update({
        auth: {
          emailAddress: emailAddress,
          password: password
        },
        params: {
          postId: createdIds[0]
        },
        body: {
          body: null
        }
      }).then(function (post) {
        assert(false, 'The body was removed.')
      }).catch(ValidationError, function (err) {
        if (Object.keys(err.messages).length !== 1
          || !err.messages.body
          || err.messages.body.length !== 1) {
          throw err
        }
      })
    })

    it('should be able to change the title', function () {
      return BlogPost.update({
        auth: {
          emailAddress: emailAddress,
          password: password
        },
        params: {
          postId: createdIds[0]
        },
        body: {
          title: title + 'a'
        }
      }).then(function (post) {
        assert.strictEqual(post.title, title + 'a', 'The title was not modified correctly.')
      })
    })

    it('should fail to remove the title', function () {
      return BlogPost.update({
        auth: {
          emailAddress: emailAddress,
          password: password
        },
        params: {
          postId: createdIds[0]
        },
        body: {
          title: null
        }
      }).then(function (post) {
        assert(false, 'The title was removed.')
      }).catch(ValidationError, function (err) {
        if (Object.keys(err.messages).length !== 1
          || !err.messages.title
          || err.messages.title.length !== 1) {
          throw err
        }
      })
    })

    it('should be able to change the preview', function () {
      return BlogPost.update({
        auth: {
          emailAddress: emailAddress,
          password: password
        },
        params: {
          postId: createdIds[0]
        },
        body: {
          preview: preview + 'a'
        }
      }).then(function (post) {
        assert.strictEqual(post.preview, preview + 'a', 'The preview was not modified correctly.')
      })
    })

    it('should be able to remove the preview', function () {
      return BlogPost.update({
        auth: {
          emailAddress: emailAddress,
          password: password
        },
        params: {
          postId: createdIds[0]
        },
        body: {
          preview: null
        }
      }).then(function (post) {
        assert.strictEqual(post.preview, null, 'The preview was not removed.')
      })
    })

    it('should be able to change the posted time', function () {
      const modifiedPostedTime = postedTime.clone().add(1, 'day')
      return BlogPost.update({
        auth: {
          emailAddress: emailAddress,
          password: password
        },
        params: {
          postId: createdIds[0]
        },
        body: {
          postedTime: modifiedPostedTime
        }
      }).then(function (post) {
        assert(modifiedPostedTime.isSame(post.postedTime), 'The wrong posted time was returned.')
      })
    })

    it('should be able to set the posted time to a number string', function () {
      const modifiedPostedTime = postedTime.clone().add(1, 'day')
      return BlogPost.update({
        auth: {
          emailAddress: emailAddress,
          password: password
        },
        params: {
          postId: createdIds[0]
        },
        body: {
          postedTime: modifiedPostedTime
        }
      }).then(function (post) {
        assert(modifiedPostedTime.isSame(post.postedTime), 'The wrong posted time was returned.')
      })
    })

    it('should fail to remove the posted time', function () {
      return BlogPost.update({
        auth: {
          emailAddress: emailAddress,
          password: password
        },
        params: {
          postId: createdIds[0]
        },
        body: {
          postedTime: null
        }
      }).then(function (post) {
        assert(false, 'The postedTime was removed.')
      }).catch(ValidationError, function (err) {
        if (Object.keys(err.messages).length !== 1
          || !err.messages.postedTime
          || err.messages.postedTime.length !== 1) {
          throw err
        }
      })
    })

    it('should fail to set the posted time to a formatted date string', function () {
      const dateString = postedTime.toString()
      return BlogPost.update({
        auth: {
          emailAddress: emailAddress,
          password: password
        },
        params: {
          postId: createdIds[0]
        },
        body: {
          postedTime: dateString
        }
      }).then(function (post) {
        assert(false, 'The postedTime was set to ' + post.postedTime + '.')
      }).catch(ValidationError, function (err) {
        if (Object.keys(err.messages).length !== 1
          || !err.messages.postedTime
          || err.messages.postedTime.length !== 1) {
          throw err
        }
      })
    })

    it('should be able to set active', function () {
      return knex
        .into('blogPosts')
        .where('id', 'ilike', escapeForLike(id))
        .update({
          active: false
        })
        .then(function () {
          return BlogPost.update({
            auth: {
              emailAddress: emailAddress,
              password: password
            },
            params: {
              postId: createdIds[0]
            },
            body: {
              active: true
            }
          })
        }).then(function (post) {
          assert.strictEqual(post.active, true, 'The active attribute was not modified correctly.')
        })
    })

    it('should be able to set inactive', function () {
      return BlogPost.update({
        auth: {
          emailAddress: emailAddress,
          password: password
        },
        params: {
          postId: createdIds[0]
        },
        body: {
          active: false
        }
      }).then(function (post) {
        assert.strictEqual(post.active, false, 'The active attribute was not modified correctly.')
      })
    })

    it('should fail to set the author to someone else', function () {
      let otherAuthorId
      return knex
        .into('users')
        .insert({
          emailAddress: 'a' + emailAddress,
          passwordHash: passwordHash,
          authorisedToBlog: true
        })
        .returning('id')
        .then(function (ids) {
          otherAuthorId = ids[0]
          return BlogPost.update({
            auth: {
              emailAddress: emailAddress,
              password: password
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
        }).then(function (post) {
          assert(false, 'The author was reassigned.')
        }).catch(ValidationError, function (err) {
          if (Object.keys(err.messages).length !== 1
            || !err.messages.author
            || Object.keys(err.messages.author).length !== 1
            || !err.messages.author.id
            || err.messages.author.id.length !== 1) {
            throw err
          }
        }).finally(function () {
          return knex
            .from('users')
            .where('id', otherAuthorId)
            .del()
        })
    })

    it('should be able to set the author to the existing author', function () {
      return BlogPost.update({
        auth: {
          emailAddress: emailAddress,
          password: password
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

    it('should be able to set the author to someone else as an admin', function () {
      let otherAuthorId
      return knex
        .into('users')
        .insert({
          emailAddress: 'a' + emailAddress,
          passwordHash: passwordHash,
          admin: true
        })
        .returning('id')
        .then(function (ids) {
          otherAuthorId = ids[0]
          return BlogPost.update({
            auth: {
              emailAddress: 'a' + emailAddress,
              password: password
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
        }).then(function (post) {
          assert.strictEqual(post.author.id, otherAuthorId, 'The author was assigned incorrectly.')
        }).catch(AuthorisationError, function () {})
        .finally(function () {
          // Change the author of the post back so that we can delete the other author.
          return knex
            .into('blogPosts')
            .where('id', createdIds[0])
            .update({
              author: authorId
            }).then(function () {
              return knex
                .from('users')
                .where('id', otherAuthorId)
                .del()
            })
        })
    })

    it('should fail to set the author without an id', function () {
      return BlogPost.update({
        auth: {
          emailAddress: emailAddress,
          password: password
        },
        params: {
          postId: createdIds[0]
        },
        body: {
          author: {}
        }
      }).then(function (post) {
        assert(false, 'The author was reassigned.')
      }).catch(ValidationError, function (err) {
        if (Object.keys(err.messages).length !== 1
          || !err.messages.author
          || Object.keys(err.messages.author).length !== 1
          || !err.messages.author.id
          || err.messages.author.id.length !== 1) {
          throw err
        }
      })
    })

    it('should fail with someone else\'s auth', function () {
      let otherAuthorId
      return knex
        .into('users')
        .insert({
          emailAddress: 'a' + emailAddress,
          passwordHash: passwordHash,
          authorisedToBlog: true
        })
        .returning('id')
        .then(function (ids) {
          otherAuthorId = ids[0]
          return BlogPost.update({
            auth: {
              emailAddress: 'a' + emailAddress,
              password: password
            },
            params: {
              postId: createdIds[0]
            },
            body: {
              body: body + 'a'
            }
          })
        }).then(function (post) {
          assert(false, 'The update succeeded.')
        }).catch(AuthorisationError, function () {})
        .finally(function () {
          return knex
            .from('users')
            .where('id', otherAuthorId)
            .del()
        })
    })

  })

  describe('delete', function () {

    beforeEach('Create the post to be deleted.', function () {
      return knex.into('blogPosts').insert({
        id: id,
        title: title,
        body: body,
        postedTime: postedTime,
        author: authorId
      }).returning('id')
        .then(function (returnedIds) {
          createdIds.push(returnedIds[0])
        })
    })

    it('should work in the happy case', function () {
      return BlogPost.delete({
        auth: {
          emailAddress: emailAddress,
          password: password
        },
        params: {
          postId: createdIds[0]
        }
      }).then(function () {
        return knex
          .from('blogPosts')
          .select('id')
          .where('id', 'ilike', escapeForLike(id))
      }).then(function (posts) {
        assert.strictEqual(posts.length, 0, 'The post was not deleted.')
      })
    })

    it('should fail when the post does not exist', function () {
      return BlogPost.delete({
        auth: {
          emailAddress: emailAddress,
          password: password
        },
        params: {
          postId: createdIds[0] + 1
        }
      }).then(function () {
        return knex
          .from('blogPosts')
          .select('id')
          .where('id', 'ilike', escapeForLike(id))
      }).then(function (posts) {
        assert(false, 'The post was deleted.')
      }).catch(NoSuchResourceError, function () {})
    })

    it('should fail with someone else\'s auth', function () {
      let otherAuthorId
      return knex
        .into('users')
        .insert({
          emailAddress: 'a' + emailAddress,
          passwordHash: passwordHash,
          authorisedToBlog: true
        })
        .returning('id')
        .then(function (ids) {
          otherAuthorId = ids[0]
          return BlogPost.delete({
            auth: {
              emailAddress: 'a' + emailAddress,
              password: password
            },
            params: {
              postId: createdIds[0]
            }
          })
        }).then(function (post) {
          assert(false, 'The deletion succeeded.')
        }).catch(AuthorisationError, function () {})
        .finally(function () {
          return knex
            .from('users')
            .where('id', otherAuthorId)
            .del()
        })
    })

    it('should fail with no auth', function () {
      return BlogPost.delete({
        params: {
          postId: createdIds[0]
        }
      }).then(function (post) {
        assert(false, 'The deletion succeeded.')
      }).catch(AuthorisationError, function () {})
    })

    it('should fail with an unauthorised user', function () {
      return knex
        .into('users')
        .where('id', authorId)
        .update({
          authorisedToBlog: false
        })
        .then(function () {
          return BlogPost.delete({
            auth: {
              emailAddress: emailAddress,
              password: password
            },
            params: {
              postId: createdIds[0]
            }
          })
        }).then(function (post) {
          assert(false, 'The deletion succeeded.')
        }).catch(AuthorisationError, function () {})
    })

  })

})
