var assert = require('assert');
var Promise = require('bluebird');
var knex = require('../../../server/database/knex');
var escapeForLike = require('../../../server/biz/utilities/escapeForLike');
var bcrypt = Promise.promisifyAll(require('bcrypt'));
var BlogPost = require('../../../server/biz/blogPost')(knex);
var AuthenticationError = require('../../../server/errors/authenticationError');
var AuthorisationError = require('../../../server/errors/authorisationError');
var MalformedRequestError = require('../../../server/errors/malformedRequestError');
var ConflictingEditError = require('../../../server/errors/conflictingEditError');
var NoSuchResourceError = require('../../../server/errors/noSuchResourceError');

describe('blog post', function () {
  var emailAddress = 'mocha.test.email.address@not.a.real.domain.com';
  var authorId;
  var password = 'taco tuesday';
  var givenName = 'Victor';
  var familyName = 'Frankenstein';
  var passwordHash = bcrypt.hashSync(password, 8);

  var createdIds = [];
  var id = '2015-12-17_a_test_post_for_the_mocha_test_suite';
  var title = 'A Test Post for the Mocha Test Suite';
  var body = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque ipsum erat, porttitor vitae bibendum eu, interdum at metus. Etiam fermentum lectus eu leo semper suscipit. Nam pharetra nisl quis nisi ullamcorper viverra. Donec vehicula ac neque a euismod. Duis venenatis, massa ut porttitor gravida, velit arcu porttitor erat, vitae fringilla sapien velit vel urna. Duis vel orci eget ante feugiat molestie eu a felis. Aenean sollicitudin interdum eros, vitae euismod ligula suscipit ac. Proin nec libero lacus. Aenean libero justo, placerat sed nisl vel, sollicitudin pellentesque erat. Morbi rhoncus risus et dolor auctor posuere. Nam aliquam, eros in vulputate euismod, purus odio mollis velit, ut tincidunt eros elit eu ex. Donec libero lorem, suscipit non augue nec, vulputate sodales dui. Sed semper felis a augue imperdiet eleifend. Proin semper viverra eleifend. Morbi vehicula pretium eros, sit amet hendrerit enim posuere sed. Nam venenatis malesuada purus ut pulvinar.\n\n' +
    'Nulla eu odio accumsan, efficitur mauris vitae, placerat nulla. Mauris nec ornare orci, a pretium orci. Vivamus mollis lorem non diam sagittis, nec rutrum dui tempor. Sed sed convallis libero. Proin mattis quam vel justo ultricies efficitur. Etiam aliquet vitae ex non gravida. Cras eget molestie ipsum. Praesent viverra cursus tempus. Nulla diam tortor, dictum ac ullamcorper id, blandit a odio. Sed fermentum purus eu ipsum suscipit, quis egestas mauris porta. In hac habitasse platea dictumst. Maecenas pharetra nisl ut justo accumsan ornare. Vestibulum massa mi, semper eu ex vel, hendrerit auctor velit.\n\n' +
    'Nulla tempus nisi varius, lacinia tortor id, dapibus quam. Phasellus venenatis eu dolor et dapibus. Nunc placerat porta enim sed fringilla. Suspendisse vel mi quam. Morbi facilisis gravida eros, nec dapibus nulla efficitur vel. Ut quam turpis, volutpat ac egestas in, ullamcorper eu velit. Fusce laoreet, elit mattis congue pellentesque, lacus dolor lobortis leo, id malesuada turpis ante id elit. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos.\n\n' +
    'Pellentesque in risus quis mi egestas tempus. Vestibulum ex mi, aliquet sit amet dui eu, viverra tristique libero. Aliquam erat volutpat. Donec pharetra semper ex, in finibus nisi lobortis vitae. Nam quis arcu mi. Donec gravida iaculis ultricies. Ut vitae enim sit amet velit ornare consectetur sit amet eget mi. Sed eleifend, nunc rhoncus lacinia placerat, ante enim convallis magna, eu vehicula erat dolor posuere dui.\n\n' +
    'Nullam rhoncus justo quis tellus pulvinar, vel interdum nibh rhoncus. Cras ultrices tempor purus vel mollis. Fusce eget massa aliquam, feugiat orci eget, facilisis tellus. Aenean vel ligula odio. Praesent vel nunc ac purus auctor dapibus vel et ligula. Morbi tristique libero et est cursus suscipit. Ut facilisis sapien neque, et ultrices eros luctus nec. Curabitur placerat dolor eget nibh gravida commodo. Phasellus et blandit sem.';
  var preview = 'This is a very short preview for a long post.';
  var postedTime = new Date();

  beforeEach('Create an author.', function () {
    return knex.into('users').insert({
      emailAddress: emailAddress,
      givenName: givenName,
      familyName: familyName,
      passwordHash: passwordHash,
      authorisedToBlog: true
    }).returning('id').then(function (ids) {
      authorId = ids[0];
    });
  });

  afterEach('Delete any created test posts.', function () {
    return Promise.all(createdIds.map(function (deletionId) {
      return knex
        .from('blogPosts')
        .where('id', 'ilike', escapeForLike(deletionId))
        .del();
    })).then(function () {
      createdIds.length = 0;
    });
  });

  afterEach('Destroy the author.', function () {
    return knex
      .from('users')
      .where('id', authorId)
      .del();
  });

  describe('create', function () {

    it('should work with good auth and minimal attributes', function () {
      return BlogPost.create({
        auth: {
          emailAddress: emailAddress,
          password: password
        },
        body: {
          id: id,
          title: title,
          body: body,
          postedTime: postedTime,
          author: {
            id: authorId
          }
        }
      }).then(function (post) {
        return knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id));
      }).then(function (posts) {
        createdIds.push(posts[0].id);
        assert(posts[0], 'No post was created.');
      });
    });

    it('should work with good auth and all attributes', function () {
      return BlogPost.create({
        auth: {
          emailAddress: emailAddress,
          password: password
        },
        body: {
          id: id,
          title: title,
          body: body,
          preview: preview,
          postedTime: postedTime,
          author: {
            id: authorId
          }
        }
      }).then(function (post) {
        return knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id));
      }).then(function (posts) {
        createdIds.push(id);
        assert(posts[0], 'No post was created.');
      });
    });

    it('should fail with bad auth and minimal attributes', function () {
      return BlogPost.create({
        auth: {
          emailAddress: emailAddress,
          password: password + 'a'
        },
        body: {
          id: id,
          title: title,
          body: body,
          postedTime: postedTime,
          author: {
            id: authorId
          }
        }
      }).then(function (post) {
        return knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id));
      }).then(function (posts) {
        createdIds.push(posts[0].id);
        assert(false, 'The creation succeeded.');
      }).catch(AuthenticationError, function () {});
    });

    it('should fail with no auth and minimal attributes', function () {
      return BlogPost.create({
        body: {
          id: id,
          title: title,
          body: body,
          postedTime: postedTime,
          author: {
            id: authorId
          }
        }
      }).then(function (post) {
        return knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id));
      }).then(function (posts) {
        createdIds.push(posts[0].id);
        assert(false, 'The creation succeeded.');
      }).catch(AuthorisationError, function () {});
    });

    it('should fail with a poorly formatted posted time', function () {
      return BlogPost.create({
        auth: {
          emailAddress: emailAddress,
          password: password
        },
        body: {
          id: id,
          title: title,
          body: body,
          postedTime: new Date('the third of October in the year twenty fifteen'),
          author: {
            id: authorId
          }
        }
      }).then(function (post) {
        return knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id));
      }).then(function (posts) {
        createdIds.push(posts[0].id);
        assert(false, 'The creation succeeded.');
      }).catch(MalformedRequestError, function () {});
    });

    it('should reject silly attributes', function () {
      return BlogPost.create({
        auth: {
          emailAddress: emailAddress,
          password: password
        },
        body: {
          id: id,
          title: title,
          body: body,
          postedTime: postedTime,
          author: {
            id: authorId
          },
          silly: 'this is not a legal attribute'
        }
      }).then(function (post) {
        return knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id));
      }).then(function (posts) {
        createdIds.push(posts[0].id);
        assert(false, 'The creation succeeded.');
      }).catch(MalformedRequestError, function () {});
    });

    it('should fail if the id is not unique', function () {
      return knex.into('blogPosts').insert({
        id: id,
        title: title,
        body: body,
        postedTime: postedTime,
        author: authorId
      }).then(function () {
        createdIds.push(id);
        return BlogPost.create({
          auth: {
            emailAddress: emailAddress,
            password: password
          },
          body: {
            id: id,
            title: title,
            body: body,
            postedTime: postedTime,
            author: {
              id: authorId
            }
          }
        });
      }).then(function (post) {
        return knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id));
      }).then(function (posts) {
        createdIds.push(posts[0].id);
        assert(false, 'The creation succeeded.');
      }).catch(ConflictingEditError, function () {});
    });

    it('should fail if the id is omitted', function () {
      return BlogPost.create({
        auth: {
          emailAddress: emailAddress,
          password: password
        },
        body: {
          title: title,
          body: body,
          postedTime: postedTime,
          author: {
            id: authorId
          }
        }
      }).then(function (post) {
        return knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id));
      }).then(function (posts) {
        createdIds.push(posts[0].id);
        assert(false, 'The creation succeeded.');
      }).catch(MalformedRequestError, function () {});
    });

    it('should fail if the body is omitted', function () {
      return BlogPost.create({
        auth: {
          emailAddress: emailAddress,
          password: password
        },
        body: {
          id: id,
          title: title,
          postedTime: postedTime,
          author: {
            id: authorId
          }
        }
      }).then(function (post) {
        return knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id));
      }).then(function (posts) {
        createdIds.push(posts[0].id);
        assert(false, 'The creation succeeded.');
      }).catch(MalformedRequestError, function () {});
    });

    it('should fail if the title is omitted', function () {
      return BlogPost.create({
        auth: {
          emailAddress: emailAddress,
          password: password
        },
        body: {
          id: id,
          body: body,
          postedTime: postedTime,
          author: {
            id: authorId
          }
        }
      }).then(function (post) {
        return knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id));
      }).then(function (posts) {
        createdIds.push(posts[0].id);
        assert(false, 'The creation succeeded.');
      }).catch(MalformedRequestError, function () {});
    });

    it('should fail if the postedTime is omitted', function () {
      return BlogPost.create({
        auth: {
          emailAddress: emailAddress,
          password: password
        },
        body: {
          id: id,
          title: title,
          body: body,
          author: {
            id: authorId
          }
        }
      }).then(function (post) {
        return knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id));
      }).then(function (posts) {
        createdIds.push(posts[0].id);
        assert(false, 'The creation succeeded.');
      }).catch(MalformedRequestError, function () {});
    });

    it('should fail if the author is omitted', function () {
      return BlogPost.create({
        auth: {
          emailAddress: emailAddress,
          password: password
        },
        body: {
          id: id,
          title: title,
          body: body,
          postedTime: postedTime
        }
      }).then(function (post) {
        return knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id));
      }).then(function (posts) {
        createdIds.push(posts[0].id);
        assert(false, 'The creation succeeded.');
      }).catch(MalformedRequestError, function () {});
    });

    it('should fail if the author is not a user', function () {
      return BlogPost.create({
        auth: {
          emailAddress: emailAddress,
          password: password
        },
        body: {
          id: id,
          title: title,
          body: body,
          postedTime: postedTime,
          author: {
            id: authorId + 1
          }
        }
      }).then(function (post) {
        return knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id));
      }).then(function (posts) {
        createdIds.push(posts[0].id);
        assert(false, 'The creation succeeded.');
      }).catch(AuthorisationError, function () {});
    });

    it('should fail if the author is not the authenticated user', function () {
      var otherAuthorId;
      var otherAuthorEmailAddress = 'a' + emailAddress;
      return knex.into('users')
        .insert({
          emailAddress: otherAuthorEmailAddress,
          givenName: givenName,
          familyName: familyName,
          passwordHash: passwordHash
        }).returning('id').then(function (ids) {
          otherAuthorId = ids[0];
        }).then(function () {
          return BlogPost.create({
            auth: {
              emailAddress: emailAddress,
              password: password
            },
            body: {
              id: id,
              title: title,
              body: body,
              postedTime: postedTime,
              author: {
                id: otherAuthorId
              }
            }
          });
        }).then(function (post) {
          return knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id));
        }).then(function (posts) {
          createdIds.push(posts[0].id);
          assert(false, 'The creation succeeded.');
        }).catch(AuthorisationError, function () {})
        .finally(function () {
          return knex
            .from('users')
            .where('id', otherAuthorId)
            .del();
        });

    });

    it('should fail if the user is not authorised to blog', function () {
      return knex.from('users').where('id', authorId).update({
        authorisedToBlog: false
      }).then(function () {
        return BlogPost.create({
          auth: {
            emailAddress: emailAddress,
            password: password
          },
          body: {
            id: id,
            title: title,
            body: body,
            postedTime: postedTime,
            author: {
              id: authorId
            }
          }
        });
      }).then(function (post) {
        return knex.select().from('blogPosts').where('id', 'ilike', escapeForLike(id));
      }).then(function (posts) {
        createdIds.push(posts[0].id);
        assert(false, 'The creation succeeded.');
      }).catch(AuthorisationError, function () {});
    });

  });

  describe('read', function () {

    var searchablePosts;

    beforeEach('Create the searchable posts.', function () {
      searchablePosts = [{
        id: id + 'a',
        title: title,
        body: body,
        postedTime: new Date(postedTime.getTime()+(4*1000*60*60*24)),
        author: authorId
      }, {
        id: id + 'b',
        title: title,
        body: body,
        postedTime: new Date(postedTime.getTime()+(3*1000*60*60*24)),
        author: authorId
      }, {
        id: id + 'c',
        title: title,
        body: body,
        postedTime: new Date(postedTime.getTime()+(2*1000*60*60*24)),
        author: authorId
      }, {
        id: id + 'd',
        title: title,
        body: body,
        postedTime: new Date(postedTime.getTime()+(1*1000*60*60*24)),
        author: authorId
      }];
      return knex.into('blogPosts').insert(searchablePosts).returning('id')
        .then(function (returnedIds) {
          Array.prototype.push.apply(createdIds, returnedIds);
        });
    });

    it('should be able to look up by postId', function () {
      return BlogPost.read({
        params: {
          postId: createdIds[0]
        }
      }).then(function (post) {
        assert(!(post instanceof Array), 'An array was returned instead of a single post.');
        assert(!!post.id, 'The returned post had no id.');
      });
    });

    it('should return the proper contents', function () {
      return BlogPost.read({
        params: {
          postId: createdIds[0]
        }
      }).then(function (post) {
        assert(!(post instanceof Array), 'An array was returned instead of a single post.');
        var exp = searchablePosts[0];
        assert.deepStrictEqual(post, {
          id: exp.id,
          title: exp.title,
          body: exp.body,
          postedTime: exp.postedTime.toISOString(),
          author: {
            id: authorId,
            givenName: givenName,
            familyName: familyName,
            active: true
          },
          active: true,
          preview: null
        }, 'The returned post was incorrect.');
      });
    });

    it('should fail to look up a non-existent post', function () {
      return BlogPost.read({
        params: {
          postId: createdIds[createdIds.length] + 'a'
        }
      }).then(function (post) {
        assert(false, 'The read succeeded');
      }).catch(NoSuchResourceError, function () {});
    });

    it('should fail to look up an inactive post without authenticating', function () {
      return knex.into('blogPosts').where('id', 'ilike', escapeForLike(createdIds[0]))
        .update({
          active: false
        }).then(function () {
          return BlogPost.read({
            params: {
              postId: createdIds[0]
            }
          });
        }).then(function (post) {
          assert(false, 'The read succeeded.');
        }).catch(AuthorisationError, function () {});
    });

    it('should fail to look up an inactive post that belongs to someone else', function () {

      // Create the other author.
      var otherAuthorId;
      var otherAuthorEmailAddress = 'a' + emailAddress;
      return knex.into('users')
        .insert({
          emailAddress: otherAuthorEmailAddress,
          givenName: givenName,
          familyName: familyName,
          passwordHash: passwordHash
        }).returning('id').then(function (ids) {
          otherAuthorId = ids[0];
        }).then(function () {

          // Deactivate the post.
          return knex.into('blogPosts').where('id', 'ilike', escapeForLike(createdIds[0]))
            .update({
              active: false
            });
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
          });

        // Assert stuff.
        }).then(function (post) {
          assert(false, 'The read succeeded.');
        }).catch(AuthorisationError, function () {})
        .finally(function () {

          // Destroy the other author.
          return knex
            .from('users')
            .where('id', otherAuthorId)
            .del();
        });
    });

    it('should be able to look up an inactive post that belongs to oneself', function () {
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
          });
        }).then(function (post) {
          assert(!(post instanceof Array), 'An array was returned instead of a single post.');
          assert(!!post.id, 'The returned post had no id.');
        });
    });

    describe('search', function () {

      it('should be able to list posts', function () {
        return BlogPost.read({}).then(function (posts) {
          assert((posts instanceof Array), 'The result was not an array.');
        });
      });

      it('should return the proper contents', function () {
        return BlogPost.read({}).then(function (posts) {
          assert((posts instanceof Array), 'The result was not an array.');
          var exp = searchablePosts[0];
          assert.deepStrictEqual(posts[0], {
            id: exp.id,
            title: exp.title,
            body: exp.body,
            postedTime: exp.postedTime.toISOString(),
            author: {
              id: authorId,
              givenName: givenName,
              familyName: familyName,
              active: true
            },
            active: true,
            preview: null
          }, 'The returned post was incorrect.');
        });
      });

      it('should see a post list that omits the inactive posts of others', function () {
        // Create the other author.
        var otherAuthorId;
        var otherAuthorEmailAddress = 'a' + emailAddress;
        return knex.into('users')
          .insert({
            emailAddress: otherAuthorEmailAddress,
            givenName: givenName,
            familyName: familyName,
            passwordHash: passwordHash
          }).returning('id').then(function (ids) {
            otherAuthorId = ids[0];
          }).then(function () {

            // Deactivate the post.
            return knex.into('blogPosts').where('id', 'ilike', escapeForLike(createdIds[0]))
              .update({
                active: false
              });
          }).then(function () {

            // Authenticate as the other author.
            return BlogPost.read({
              auth: {
                emailAddress: otherAuthorEmailAddress,
                password: password
              }
            });

          // Assert stuff.
          }).then(function (posts) {
            assert.strictEqual(posts.length, searchablePosts.length - 1, 'The list contains the wrong number of posts.');
            for (var i in posts) {
              var post = posts[i];
              assert.strictEqual(post.author.id, authorId, 'The list contains posts by the wrong author.');
              assert(post.active, 'The list contained an inactive post.');
              assert.notStrictEqual(post.id, createdIds[0], 'The list contained the post that was deactivated.');
            }
          }).finally(function () {

            // Destroy the other author.
            return knex
              .from('users')
              .where('id', otherAuthorId)
              .del();
          });
      });

      it('should see a post list that includes the inactive posts of oneself', function () {
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
            });

          // Assert stuff.
          }).then(function (posts) {
            assert.strictEqual(posts.length, searchablePosts.length, 'The list contains the wrong number of posts.');
            var inactivePostEncountered = false;
            for (var i in posts) {
              var post = posts[i];
              assert.strictEqual(post.author.id, authorId, 'The list contains posts by the wrong author.');
              if (!post.active && post.id === createdIds[0]) {
                inactivePostEncountered = true;
              }
            }
            assert(inactivePostEncountered, 'The list did not contain the post that was deactivated.');
          });
      });

    });
  });

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
          createdIds.push(returnedIds[0]);
        });
    });

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
        assert.strictEqual(post.body, body + 'a', 'The body was not modified correctly.');
      });
    });

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
        assert(false, 'The body was removed.');
      }).catch(MalformedRequestError, function () {});
    });

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
        assert.strictEqual(post.title, title + 'a', 'The title was not modified correctly.');
      });
    });

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
        assert(false, 'The title was removed.');
      }).catch(MalformedRequestError, function () {});
    });

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
        assert.strictEqual(post.preview, preview + 'a', 'The preview was not modified correctly.');
      });
    });

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
        assert.strictEqual(post.preview, null, 'The preview was not removed.');
      });
    });

    it('should be able to change the posted time', function () {
      var modifiedPostedTime = new Date(postedTime.getTime() + (1000 * 60 * 60 * 24)); // add one day
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
        assert.strictEqual(post.postedTime.getTime(), modifiedPostedTime.getTime(), 'The posted time was not modified correctly.');
      });
    });

    it('should be able to set the posted time to a string representing a good date', function () {
      var dateString = postedTime.toISOString();
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
        assert.strictEqual(post.postedTime.getTime(), postedTime.getTime(), 'The posted time was not modified correctly.');
      });
    });

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
        assert(false, 'The postedTime was removed.');
      }).catch(MalformedRequestError, function () {});
    });

    it('should fail to set the posted time to an invalid date', function () {
      return BlogPost.update({
        auth: {
          emailAddress: emailAddress,
          password: password
        },
        params: {
          postId: createdIds[0]
        },
        body: {
          postedTime: '2015-02-29T22:43:21.845Z'
        }
      }).then(function (post) {
        assert(false, 'The postedTime was set to ' + post.postedTime + '.');
      }).catch(MalformedRequestError, function () {});
    });

    it('should fail to set the posted time to a nonsense string', function () {
      return BlogPost.update({
        auth: {
          emailAddress: emailAddress,
          password: password
        },
        params: {
          postId: createdIds[0]
        },
        body: {
          postedTime: 'This string is not a date.'
        }
      }).then(function (post) {
        assert(false, 'The postedTime was set to ' + post.postedTime + '.');
      }).catch(MalformedRequestError, function () {});
    });

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
          });
        }).then(function (post) {
          assert.strictEqual(post.active, true, 'The active attribute was not modified correctly.');
        });
    });

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
        assert.strictEqual(post.active, false, 'The active attribute was not modified correctly.');
      });
    });

    it('should fail to set the author to someone else', function () {
      var otherAuthorId;
      return knex
        .into('users')
        .insert({
          emailAddress: 'a' + emailAddress,
          passwordHash: passwordHash
        })
        .returning('id')
        .then(function (ids) {
          otherAuthorId = ids[0];
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
          });
        }).then(function (post) {
          assert(false, 'The author was reassigned.');
        }).catch(AuthorisationError, function () {})
        .finally(function () {
          return knex
            .from('users')
            .where('id', otherAuthorId)
            .del() ;
        });
    });

    it('should fail with someone else\'s auth', function () {
      var otherAuthorId;
      return knex
        .into('users')
        .insert({
          emailAddress: 'a' + emailAddress,
          passwordHash: passwordHash
        })
        .returning('id')
        .then(function (ids) {
          otherAuthorId = ids[0];
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
          });
        }).then(function (post) {
          assert(false, 'The update succeeded.');
        }).catch(AuthorisationError, function () {});
    });

  });

  describe('delete', function () {
    it('should work in the happy case');
    it('should fail with someone else\'s auth');
  });

});
