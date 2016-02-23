'use strict'
var knex = require('../../../api/database/knex')
var assert = require('assert')
var sinon = require('sinon')
var Promise = require('bluebird')
var bcrypt = Promise.promisifyAll(require('bcrypt'))
var mockEmailer = sinon.spy(function () {
  if (mockEmailer.err) {
    return Promise.reject(mockEmailer.err)
  } else {
    return Promise.resolve()
  }
})
var User = require('../../../api/biz/users')(knex, mockEmailer)
var MalformedRequestError = require('../../../api/errors/malformedRequestError')
var ConflictingEditError = require('../../../api/errors/conflictingEditError')
var AuthenticationError = require('../../../api/errors/authenticationError')
var AuthorisationError = require('../../../api/errors/authorisationError')
var NoSuchResourceError = require('../../../api/errors/noSuchResourceError')
var validate = require('../../../utilities/validate')
var ValidationError = validate.ValidationError

function EmailerError(message) {
  Error.call(this)
  this.name = this.constructor.name
  this.message = message || 'The emailer failed.'
  this.errorCode = 501
  Error.captureStackTrace(this, this.constructor)
}
EmailerError.prototype = Object.create(Error.prototype)
EmailerError.prototype.constructor = EmailerError

describe('users', function () {
  var createdIds = []

  beforeEach('Reset the mock emailer.', function () {
    mockEmailer.reset()
    delete mockEmailer.err
  })
  afterEach('Delete any created test users.', function () {
    return knex.from('users').where('id', 'in', createdIds).del().then(function () {
      createdIds.length = 0
    })
  })

  describe('create', function () {
    var emailAddress = 'mocha.test.email.address@not.a.real.domain.com'
    var badEmailAddress = 'NotAValidEmailAddress.com'

    it('should work with a good email address', function () {
      return User.create({
        body: {
          emailAddress: emailAddress
        }
      }).then(function (user) {
        return knex.select().from('users').where('emailAddress', emailAddress)
      }).then(function (users) {
        createdIds.push(users[0].id)
        assert(users[0], 'No user was created.')
        assert(mockEmailer.withArgs(emailAddress).calledOnce, 'The emailer was not called.')
      })
    })

    it('should send a correct password reset email', function () {
      return User.create({
        body: {
          emailAddress: emailAddress
        }
      }).then(function (user) {
        return knex.select().from('users').where('emailAddress', emailAddress)
      }).then(function (users) {
        var user = users[0]
        assert(user, 'No user was created.')
        createdIds.push(user.id)
        assert(mockEmailer.withArgs(emailAddress).calledOnce, 'The emailer was not called.')
        var passwordResetKey = mockEmailer.getCall(0).args[2].match(/(?:setPassword\?key=)([A-Za-z\d]{30})/)[1]
        assert(bcrypt.compareSync(passwordResetKey, user.passwordResetKeyHash), 'The email contained the wrong password reset key.')
      })
    })

    it('should make a user active by default', function () {
      return User.create({
        body: {
          emailAddress: emailAddress
        }
      }).then(function (user) {
        return knex.select().from('users').where('emailAddress', emailAddress)
      }).then(function (users) {
        createdIds.push(users[0].id)
        assert(users[0].active, 'The user is not active.')
      })
    })

    it('should reject non-creation attributes', function () {
      return User.create({
        body: {
          emailAddress: emailAddress,
          active: false
        }
      }).then(function (user) {
        return knex.select().from('users').where('emailAddress', emailAddress)
      }).then(function (users) {
        createdIds.push(users[0].id)
        assert(false, 'The creation succeeded.')
      }).catch(MalformedRequestError, function () {})
    })

    it('should fail when the email address is omitted', function () {
      return User.create({
        body: {}
      }).then(function (user) {
        return knex.select().from('users').where('emailAddress', emailAddress)
      }).then(function (users) {
        createdIds.push(users[0].id)
        assert(false, 'The creation succeeded.')
      }).catch(MalformedRequestError, function () {})
    })

    it('should fail when the email address is not unique', function () {
      return knex.into('users').insert({
        emailAddress: emailAddress
      }).returning('id').then(function (ids) {
        createdIds.push(ids[0])
        return User.create({
          body: {
            emailAddress: emailAddress.toUpperCase()
          }
        })
      }).then(function (user) {
        createdIds.push(user.id)
        assert(false, 'The creation succeeded.')
      }).catch(ConflictingEditError, function () {})
    })

    it('should fail with an invalid email address', function () {
      return User.create({
        body: {
          emailAddress: badEmailAddress
        }
      }).then(function (user) {
        createdIds.push(user.id)
        assert(false, 'The creation succeeded.')
      }).catch(MalformedRequestError, function () {})
    })

    it('should fail with a failing emailer', function () {
      mockEmailer.err = new EmailerError()
      return User.create({
        body: {
          emailAddress: emailAddress
        }
      }).then(function (user) {
        return knex.select().from('users').where('emailAddress', emailAddress)
      }).then(function (users) {
        createdIds.push(users[0].id)
        assert(!mockEmailer.called, 'The password setting email was sent.')
        assert(false, 'The creation did not fail.')
      }).catch(EmailerError, function () {})
    })

  })

  describe('read', function () {
    var emailAddress = 'mocha.test.email.address@not.a.real.domain.com'
    var password = 'taco tuesday'
    var givenName1 = 'James'
    var givenName2 = 'Paula'
    var familyName1 = 'Deen'
    var familyName2 = 'Poundstone'
    var searchableUsers = [{
      emailAddress: '0' + emailAddress,
      givenName: givenName1,
      familyName: familyName1,
      authorisedToBlog: false
    }, {
      emailAddress: '1' + emailAddress,
      givenName: givenName2,
      familyName: familyName2,
      authorisedToBlog: true
    }, {
      emailAddress: '2' + emailAddress,
      givenName: givenName2,
      familyName: familyName1,
      authorisedToBlog: true
    }, {
      emailAddress: '3' + emailAddress,
      givenName: givenName1,
      familyName: familyName2,
      authorisedToBlog: false
    }]

    beforeEach('Create the searchable users.', function () {
      return knex.into('users').insert(searchableUsers).returning('id')
        .then(function (returnedIds) {
          Array.prototype.push.apply(createdIds, returnedIds)
        })
    })

    it('should be able to look up by userId', function () {
      return User.read({
        params: {
          userId: createdIds[0]
        }
      }).then(function (user) {
        assert(!(user instanceof Array), 'An array was returned instead of a single user.')
        assert.deepStrictEqual(user, {
          id: createdIds[0],
          givenName: searchableUsers[0].givenName,
          familyName: searchableUsers[0].familyName,
          active: true,
          authorisedToBlog: false
        }, 'The returned user was incorrect.')
      })
    })

    it('should fail to look up a non-existent user.', function () {
      //Create a user, store his ID, then delete the user.
      var badId
      return knex.into('users').insert({
        emailAddress: 'different' + emailAddress
      }).returning('id').then(function (ids) {
        badId = ids[0]
        return knex.from('users').where('id', badId).del()
      }).then(function () {

        // Try to read the user.
        return User.read({
          params: {
            userId: badId
          }
        })
      }).then(function (user) {
        assert(false, 'The read succeeded.')
      }).catch(NoSuchResourceError, function () {})
    })

    it('should fail to authenticate with an unassigned email address', function () {
      return User.read({
        auth: {
          emailAddress: 'notAssigned' + emailAddress,
          password: password
        },
        params: {
          userId: createdIds[0]
        }
      }).then(function (user) {
        assert(false, 'Authentication did not fail.')
      }).catch(AuthenticationError, function () {})
    })

    it('should fail to authenticate with a wrong password', function () {
      return User.read({
        auth: {
          emailAddress: emailAddress,
          password: password + 'wrong'
        },
        params: {
          userId: createdIds[0]
        }
      }).then(function (user) {
        assert(false, 'Authentication did not fail.')
      }).catch(AuthenticationError, function () {})
    })

    describe('search', function () {

      it('should be able to list all users', function () {
        var count
        return knex.from('users').count('id')
          .then(function (result) {
            count = Number.parseInt(result[0].count)
          })
          .then(function () {
            return User.read({
              params: {}
            })
          })
          .then(function (users) {
            assert.strictEqual(users.length, count, 'The wrong number of users was returned.')
          })
      })

      it('should be able to sort the list by family name, descending', function () {
        var count
        return knex.from('users').count('id')
          .then(function (result) {
            count = Number.parseInt(result[0].count)
          })
          .then(function () {
            return User.read({
              query: {
                sortBy: 'familyName',
                sortOrder: 'descending'
              }
            })
          }).then(function (users) {
            assert.strictEqual(users.length, count, 'The wrong number of users was returned.')
            for (var i = 0; i < users.length - 1; ++i) {
              var inOrder = (users[i].familyName >= users[i + 1].familyName)
              var notNull = (users[i].familyName && users[i + 1].familyName)
              assert((!notNull) || inOrder, 'The returned users were in the wrong order.')
            }
          })
      })

      it('should be able to sort the list by family name, ascending', function () {
        var count
        return knex.from('users').count('id')
          .then(function (result) {
            count = Number.parseInt(result[0].count)
          })
          .then(function () {
            return User.read({
              query: {
                sortBy: 'familyName',
                sortOrder: 'ascending'
              }
            })
          }).then(function (users) {
            assert.strictEqual(users.length, count, 'The wrong number of users was returned.')
            for (var i = 0; i < users.length - 1; ++i) {
              var inOrder = (users[i].familyName <= users[i + 1].familyName)
              var notNull = (users[i].familyName && users[i + 1].familyName)
              assert((!notNull) || inOrder, 'The returned users were in the wrong order.')
            }
          })
      })

      it('should fail to sort the list by a bad attribute', function () {
        return User.read({
          query: {
            sortBy: 'active', // not sortrable
            sortOrder: 'ascending'
          }
        }).then(function (users) {
          assert(false, 'The read succeeded.')
        }).catch(ValidationError, function (err) {
          if (Object.keys(err.messages).length !== 1
            || !err.messages.sortBy
            || err.messages.sortBy.length !== 1) {
            throw err
          }
        })
      })

      it('should be able to search by family name', function () {
        return User.read({
          query: {
            familyName: familyName1
          }
        }).then(function (users) {
          assert.strictEqual(users.length, 2, 'The wrong number of users was returned.')
          for (var i in users) {
            assert.strictEqual(users[i].familyName, familyName1, 'The wrong users were returned.')
          }
        })
      })

      it('should be able to search by partial, lower-case family name', function () {
        return User.read({
          query: {
            familyName: familyName1.substr(0, 3).toLowerCase()
          }
        }).then(function (users) {
          assert.strictEqual(users.length, 2, 'The wrong number of users was returned.')
          for (var i in users) {
            assert.strictEqual(users[i].familyName, familyName1, 'The wrong users were returned.')
          }
        })
      })

      it('should fail to search by family name using like expressions', function () {
        return User.read({
          query: {
            familyName: familyName1.replace('e', '_')
          }
        }).then(function (users) {
          assert.strictEqual(users.length, 0, 'The wrong number of users was returned.')
        })
      })

      it('should be able to search by family name and given name', function () {
        return User.read({
          query: {
            familyName: familyName1,
            givenName: givenName1
          }
        }).then(function (users) {
          assert.strictEqual(users.length, 1, 'The wrong number of users was returned.')
          assert.strictEqual(users[0].givenName, givenName1, 'The returned user has the wrong given name.')
          assert.strictEqual(users[0].familyName, familyName1, 'The returned user has the wrong family name.')
        })
      })

      it('should be able to search by family name and sort by given name, descending', function () {
        return User.read({
          query: {
            familyName: familyName1,
            sortBy: 'givenName',
            sortOrder: 'descending'
          }
        }).then(function (users) {
          assert.strictEqual(users.length, 2, 'The wrong number of users was returned.')
          for (var i in users) {
            assert.strictEqual(users[i].familyName, familyName1, 'The wrong users were returned.')
          }
          assert.strictEqual(users[0].givenName, givenName2, 'The wrong user was first.')
        })
      })

      it('should be able to search by family name and sort by given name, ascending', function () {
        return User.read({
          query: {
            familyName: familyName1,
            sortBy: 'givenName',
            sortOrder: 'ascending'
          }
        }).then(function (users) {
          assert.strictEqual(users.length, 2, 'The wrong number of users was returned.')
          for (var i in users) {
            assert.strictEqual(users[i].familyName, familyName1, 'The wrong users were returned.')
          }
          assert.strictEqual(users[0].givenName, givenName1, 'The wrong user was first.')
        })
      })

      it('should be able to search by blog authorisation and sort by family name, ascending', function () {
        return User.read({
          query: {
            authorisedToBlog: true,
            sortBy: 'familyName',
            sortOrder: 'ascending'
          }
        }).then(function (users) {
          assert.strictEqual(users.length, 2, 'The wrong number of users was returned.')
          for (var i in users) {
            assert(users[i].authorisedToBlog, 'The wrong users were returned.')
          }
          assert.strictEqual(users[0].familyName, familyName1, 'The wrong user was first.')
        })
      })

      it('should fail to search by email address', function () {
        return User.read({
          query: {
            emailAddress: emailAddress
          }
        }).then(function (users) {
          assert(false, 'The read succeeded')
        }).catch(ValidationError, function (err) {
          if (Object.keys(err.messages).length !== 1
            || !err.messages.emailAddress
            || err.messages.emailAddress.length !== 1) {
            throw err
          }
        })
      })

      it('should fail to search with a malformed query', function () {
        return User.read({
          query: {
            familyName: familyName1,
            notARealAttribute: 'hello'
          }
        }).then(function () {
          assert(false, 'The read succeeded.')
        }).catch(ValidationError, function (err) {
          if (Object.keys(err.messages).length !== 1
            || !err.messages.notARealAttribute
            || err.messages.notARealAttribute.length !== 1) {
            throw err
          }
        })
      })

      it('should fail to search with a userId', function () {
        return User.read({
          params: {
            userId: createdIds[0]
          },
          query: {
            familyName: familyName1
          }
        }).then(function () {
          assert(false, 'The read succeeded.')
        }).catch(MalformedRequestError, function () {})
      })
    })

    context('as an admin', function () {
      var adminUser = {
        emailAddress: 'mocha.test.admin@example.com',
        password: 'I do what I want.'
      }

      beforeEach(function () {
        return knex.into('users').insert({
          emailAddress: adminUser.emailAddress,
          passwordHash: bcrypt.hashSync(adminUser.password, 8),
          admin: true,
          active: true
        }).returning('id').then(function (ids) {
          createdIds.push(ids[0])
        })
      })

      it('should be able to search by email address', function () {
        return User.read({
          query: {
            emailAddress: searchableUsers[0].emailAddress
          },
          auth: adminUser
        }).then(function (users) {
          assert.strictEqual(users.length, 1, 'The wrong number of users was returned.')
          for (var i in users) {
            assert.strictEqual(users[i].emailAddress, searchableUsers[0].emailAddress, 'The wrong users were returned.')
          }
        })
      })

    })

  })

  describe('update', function () {
    var emailAddress = 'mocha.test.email.address@not.a.real.domain.com'
    var badEmailAddress = 'NotAValidEmailAddress.com'
    var password = 'taco tuesday'
    var givenName = 'Victor'
    var familyName = 'Frankenstein'
    var passwordHash = bcrypt.hashSync(password, 8)

    beforeEach('Create a user to be updated.', function () {
      return knex.into('users').insert({
        emailAddress: emailAddress,
        passwordHash: passwordHash
      }).returning('id').then(function (ids) {
        createdIds.push(ids[0])
      })
    })

    it('should be able to set a password while authenticated', function () {
      return User.update({
        auth: {
          emailAddress: emailAddress,
          password: password
        },
        params: {
          userId: createdIds[0]
        },
        body: {
          password: password + 'a'
        }
      }).then(function () {
        return User.update({
          auth: {
            emailAddress: emailAddress,
            password: password + 'a'
          },
          params: {
            userId: createdIds[0]
          },
          body: {
            password: password
          }
        })
      })
    })

    it('should fail to set a too short password', function () {
      return User.update({
        auth: {
          emailAddress: emailAddress,
          password: password
        },
        params: {
          userId: createdIds[0]
        },
        body: {
          password: '1234567'
        }
      }).then(function () {
        assert(false, 'The update succeeded.')
      }).catch(ValidationError, function (err) {
        if (Object.keys(err.messages).length !== 1
          || !err.messages.password
          || err.messages.password.length !== 1) {
          throw err
        }
      })
    })

    it('should fail to set a too long password', function () {
      return User.update({
        auth: {
          emailAddress: emailAddress,
          password: password
        },
        params: {
          userId: createdIds[0]
        },
        body: {
          password: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcde'
        }
      }).then(function () {
        assert(false, 'The update succeeded.')
      }).catch(ValidationError, function (err) {
        if (Object.keys(err.messages).length !== 1
          || !err.messages.password
          || err.messages.password.length !== 1) {
          throw err
        }
      })
    })

    it('should fail to set a property that users do not have', function () {
      return User.update({
        auth: {
          emailAddress: emailAddress,
          password: password
        },
        params: {
          userId: createdIds[0]
        },
        body: {
          notARealAttribute: 'hello'
        }
      }).then(function () {
        assert(false, 'The update succeeded.')
      }).catch(ValidationError, function (err) {
        if (Object.keys(err.messages).length !== 1
          || !err.messages.notARealAttribute
          || err.messages.notARealAttribute.length !== 1) {
          throw err
        }
      })
    })

    it('should be able to set an email address', function () {
      return User.update({
        auth: {
          emailAddress: emailAddress,
          password: password
        },
        params: {
          userId: createdIds[0]
        },
        body: {
          emailAddress: 'different' + emailAddress
        }
      }).then(function (user) {
        assert.strictEqual(user.emailAddress, 'different' + emailAddress, 'The email address is wrong.')
        return User.update({
          auth: {
            emailAddress: 'different' + emailAddress,
            password: password
          },
          params: {
            userId: createdIds[0]
          },
          body: {
            emailAddress: emailAddress
          }
        })
      })
    })

    it('should fail to set an improper email address', function () {
      return User.update({
        auth: {
          emailAddress: emailAddress,
          password: password
        },
        params: {
          userId: createdIds[0]
        },
        body: {
          emailAddress: badEmailAddress
        }
      }).then(function (user) {
        assert.notStrictEqual(user.emailAddress, badEmailAddress, 'The email address was set to "' + badEmailAddress + '".')
        assert(false, 'The update succeeded.')
      }).catch(ValidationError, function (err) {
        if (Object.keys(err.messages).length !== 1
          || !err.messages.emailAddress
          || err.messages.emailAddress.length !== 1) {
          throw err
        }
      })
    })

    it('should fail to set an email address without authenticating', function () {
      return User.update({
        params: {
          userId: createdIds[0]
        },
        body: {
          emailAddress: emailAddress
        }
      }).then(function () {
        assert(false, 'The update succeeded.')
      }).catch(AuthenticationError, function () {})
    })

    it('should be able to set inactive', function () {
      return User.update({
        auth: {
          emailAddress: emailAddress,
          password: password
        },
        params: {
          userId: createdIds[0]
        },
        body: {
          active: false
        }
      }).then(function (user) {
        assert(!user.active, 'The user is not active.')
      })
    })

    it('should be able to set active', function () {
      return User.update({
        auth: {
          emailAddress: emailAddress,
          password: password
        },
        params: {
          userId: createdIds[0]
        },
        body: {
          active: true
        }
      }).then(function (user) {
        assert(user.active, 'The user is not active.')
      })
    })

    it('should be able to set a given name and family name', function () {
      return User.update({
        auth: {
          emailAddress: emailAddress,
          password: password
        },
        params: {
          userId: createdIds[0]
        },
        body: {
          givenName: givenName,
          familyName: familyName
        }
      })
    })

    it('should be able to send a password reset email', function () {
      return User.update({
        body: {
          emailAddress: emailAddress,
          passwordResetKey: null
        }
      }).then(function () {
        assert(mockEmailer.calledOnce, 'The emailer was not called.')
      })
    })

    it('should be able to send a password reset email with an all-caps email address', function () {
      return User.update({
        body: {
          emailAddress: emailAddress.toUpperCase(),
          passwordResetKey: null
        }
      }).then(function () {
        assert(mockEmailer.calledOnce, 'The emailer was not called.')
      })
    })

    it('should fail to send a password reset email with a failing emailer', function () {
      mockEmailer.err = new EmailerError()
      return User.update({
        body: {
          emailAddress: emailAddress,
          passwordResetKey: null
        }
      }).then(function (user) {
        assert(false, 'The email was sent.')
      }).catch(EmailerError, function () {})
    })

    it('should fail to send a password reset email with extra attributes', function () {
      return User.update({
        body: {
          emailAddress: emailAddress,
          passwordResetKey: null,
          familyName: familyName
        }
      }).then(function () {
        assert(!mockEmailer.called, 'The emailer was called.')
        assert(false, 'The update did not fail.')
      }).catch(ValidationError, function (err) {
        if (Object.keys(err.messages).length !== 1
          || !err.messages.familyName
          || err.messages.familyName.length !== 1) {
          throw err
        }
      })
    })

    context('as an admin', function () {
      var adminUser = {
        emailAddress: 'mocha.test.admin@example.com',
        password: 'I do what I want.'
      }

      beforeEach(function () {
        return knex.into('users').insert({
          emailAddress: adminUser.emailAddress,
          passwordHash: bcrypt.hashSync(adminUser.password, 8),
          admin: true,
          active: true
        }).returning('id').then(function (ids) {
          createdIds.push(ids[0])
        })
      })

      it('should be able to modify the given name of another user', function () {
        return User.update({
          params: {
            userId: createdIds[0]
          },
          body: {
            givenName: givenName + 'ia'
          },
          auth: {
            emailAddress: adminUser.emailAddress,
            password: adminUser.password
          }
        }).then(function (user) {
          assert.strictEqual(user.givenName, givenName + 'ia', 'The edit failed.')
        })
      })

      it('should be able to make another user an admin', function () {
        return User.update({
          params: {
            userId: createdIds[0]
          },
          body: {
            admin: true
          },
          auth: {
            emailAddress: adminUser.emailAddress,
            password: adminUser.password
          }
        }).then(function (user) {
          assert(user.admin, 'The edit failed.')
        })
      })

      it('should be able to make another user a blogger', function () {
        return User.update({
          params: {
            userId: createdIds[0]
          },
          body: {
            authorisedToBlog: true
          },
          auth: {
            emailAddress: adminUser.emailAddress,
            password: adminUser.password
          }
        }).then(function (user) {
          assert(user.authorisedToBlog, 'The edit failed.')
        })
      })

    })

    context('after password reset email', function () {
      var passwordResetKey = {
        key: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcd'
      }
      passwordResetKey.hash = bcrypt.hashSync(passwordResetKey.key, 8)

      beforeEach('Set the password reset key.', function () {
        return knex.into('users').where('id', createdIds[0]).update({
          passwordResetKeyHash: passwordResetKey.hash
        })
      })

      it('should be able to set a password anonymously with a key', function () {
        return User.update({
          params: {
            userId: createdIds[0]
          },
          body: {
            passwordResetKey: passwordResetKey.key,
            password: password
          }
        })
      })

      it('should not be able to resuse the password reset key', function () {
        var completedFirstUpdate = false
        return User.update({
          params: {
            userId: createdIds[0]
          },
          body: {
            passwordResetKey: passwordResetKey.key,
            password: password
          }
        }).then(function () {
          completedFirstUpdate = true
          return User.update({
            params: {
              userId: createdIds[0]
            },
            body: {
              passwordResetKey: passwordResetKey.key,
              password: password
            }
          })
        }).then(function () {
          assert(false, 'The update succeeded.')
        }).catch(AuthenticationError, function () {
          assert(completedFirstUpdate, 'The first update failed.')
        })
      })

      it('should fail to set a password with an incorrect key', function () {
        return User.update({
          params: {
            userId: createdIds[0]
          },
          body: {
            password: password,
            passwordResetKey: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabce'
          }
        }).then(function () {
          assert(false, 'The update succeeded.')
        }).catch(AuthenticationError, function () {})
      })

      it('should fail to set a password anonymously with extra attributes', function () {
        return User.update({
          params: {
            userId: createdIds[0]
          },
          body: {
            passwordResetKey: passwordResetKey.key,
            password: password,
            emailAddress: emailAddress // This attribute is not expected.
          }
        }).then(function () {
          assert(false, 'The update succeeded.')
        }).catch(ValidationError, function (err) {
          if (Object.keys(err.messages).length !== 1
            || !err.messages.emailAddress
            || err.messages.emailAddress.length !== 1) {
            throw err
          }
        })
      })

    })

    context('while authenticated as someone else', function () {
      var otherEmailAddress = 'somethingElse' + emailAddress

      beforeEach('Create the other user to edit.', function () {
        return knex.into('users').insert({
          emailAddress: otherEmailAddress
        }).returning('id').then(function (ids) {
          createdIds.push(ids[0])
        })
      })

      it('should fail to set inactive', function () {
        return User.update({
          auth: {
            emailAddress: emailAddress,
            password: password
          },
          params: {
            userId: createdIds[1]
          },
          body: {
            active: false
          }
        }).then(function () {
          assert(false, 'The update succeeded.')
        }).catch(AuthorisationError, function () {})
      })

      it('should fail to set a password', function () {
        return User.update({
          auth: {
            emailAddress: emailAddress,
            password: password
          },
          params: {
            userId: createdIds[1]
          },
          body: {
            password: password
          }
        }).then(function () {
          assert(false, 'The update succeeded.')
        }).catch(AuthorisationError, function () {})
      })

    })

    context('when the user does not exist', function () {
      var otherEmailAddress = 'somethingElse' + emailAddress
      var badId

      beforeEach('Get an unassigned ID.', function () {
        //Create a user, store his ID, then delete the user.
        return knex.into('users').insert({
          emailAddress: otherEmailAddress
        }).returning('id').then(function (ids) {
          badId = ids[0]
          return knex.from('users').where('id', badId).del()
        })
      })

      it('should fail to set an email address', function () {
        return User.update({
          auth: {
            emailAddress: emailAddress,
            password: password
          },
          params: {
            userId: badId
          },
          body: {
            emailAddress: 'different' + emailAddress
          }
        }).then(function () {
          assert(false, 'The update did not fail.')
        }).catch(AuthorisationError, function () {})
      })

      it('should fail to do an anonymous password reset', function () {
        return User.update({
          params: {
            userId: badId
          },
          body: {
            passwordResetKey: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcd',
            password: password
          }
        }).then(function () {
          assert(false, 'The update did not fail.')
        }).catch(NoSuchResourceError, function () {})
      })

      it('should fail to send a password reset email', function () {
        return User.update({
          body: {
            emailAddress: 'notAssigned' + emailAddress,
            passwordResetKey: null
          }
        }).then(function () {
          assert(!mockEmailer.called, 'The emailer was called.')
          assert(false, 'The update did not fail.')
        }).catch(NoSuchResourceError, function () {})
      })

    })

  })

})