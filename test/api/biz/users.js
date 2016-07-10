'use strict'
const knex = require('../../../api/database/knex')
const assert = require('assert')
const sinon = require('sinon')
const bcrypt = require('bcrypt')
const mockEmailer = sinon.spy(() => {
  if (mockEmailer.err) {
    return Promise.reject(mockEmailer.err)
  } else {
    return Promise.resolve()
  }
})
const User = require('../../../api/biz/users')(knex, mockEmailer)
const Jimp = require('jimp')
const fs = require('fs')
const path = require('path')
const MalformedRequestError = require('../../../errors/malformedRequestError')
const ConflictingEditError = require('../../../errors/conflictingEditError')
const AuthenticationError = require('../../../errors/authenticationError')
const AuthorisationError = require('../../../errors/authorisationError')
const NoSuchResourceError = require('../../../errors/noSuchResourceError')
const validate = require('../../../utilities/validate')
const { ValidationError } = validate

function EmailerError(message) {
  Error.call(this)
  this.name = this.constructor.name
  this.message = message || 'The emailer failed.'
  this.errorCode = 501
  Error.captureStackTrace(this, this.constructor)
}
EmailerError.prototype = Object.create(Error.prototype)
EmailerError.prototype.constructor = EmailerError

describe('users', () => {
  const createdIds = []

  let goodAvatar = 'data:image/jpeg;base64,'
  let hexGoodAvatar
  before('Create a good avatar.', () =>
    new Promise((resolve, reject) => {
      new Jimp(400, 1000).getBuffer(Jimp.MIME_JPEG, (err, buffer) => {
        if (err)
          reject(err)
        else
          resolve(buffer)
      })
    })
    .then(buffer => {
      goodAvatar += buffer.toString('base64')
      hexGoodAvatar = buffer.toString('hex')
    })
  )
  let defaultAvatar
  before('Load the default avatar.', () => {
    defaultAvatar = fs.readFileSync(path.join(
      '.', 'client', 'assets', 'images', 'defaultAvatar.jpg'
    ))
  })
  let processedAvatar = 'data:image/jpeg;base64,'
  before('Create a processed avatar.', () =>
    Jimp.read(Buffer.from(goodAvatar.split(',')[1], 'base64'))
      .then(image => new Promise((resolve, reject) => {
        image
          .cover(200, 200)
          .quality(60)
          .getBuffer(Jimp.MIME_JPEG, (err, buffer) => {
            if (err)
              reject(err)
            else
              resolve(buffer)
          })
      }))
      .then(buffer => {
        processedAvatar += buffer.toString('base64')
      })
  )
  let tooLargeAvatar = 'data:image/jpeg;base64,'
  before('Create a too large avatar.', function (done) {
    this.timeout(5000)
    return new Promise((resolve, reject) => {
      new Jimp(3000, 3000).getBuffer(Jimp.MIME_JPEG, (err, buffer) => {
        if (err)
          reject(err)
        else
          resolve(buffer)
      })
    })
    .then(buffer => {
      tooLargeAvatar += buffer.toString('base64')
      done()
    })
  })
  const notAnImageAvatar = 'data:image/jpeg;base64,VGhpcyBmaWxlIGlzIG5vdCBhbiBpbWFnZS4K'


  beforeEach('Reset the mock emailer.', () => {
    mockEmailer.reset()
    delete mockEmailer.err
  })
  afterEach('Delete any created test users.', () => {
    return knex.from('users').del().then(() => {
      createdIds.length = 0
    })
  })

  describe('create', () => {
    const emailAddress = 'mocha.test.email.address@not.a.real.domain.com'
    const badEmailAddress = 'NotAValidEmailAddress.com'
    const givenName = 'Victor'
    const familyName = 'Frankenstein'

    it('should work with the proper attributes', () =>
      User.create({
        body: {
          emailAddress,
          givenName,
          familyName
        }
      }).then(user =>
        knex.select().from('users').where('emailAddress', emailAddress)
      ).then(users => {
        createdIds.push(users[0].id)
        assert(users[0], 'No user was created.')
        assert(mockEmailer.withArgs(emailAddress).calledOnce, 'The emailer was not called.')
      })
    )

    it('should fail without a name', () =>
      User.create({
        body: {
          emailAddress
        }
      })
      .then(user => {
        assert(false, 'The creation succeeded.')
      })
      .catch(err => {
        if (err instanceof ValidationError) {
          assert(err.messages.givenName, 'wrong error')
          assert(err.messages.familyName, 'wrong error')
        } else {
          throw err
        }
      })
    )

    it('should send a correct password reset email', () => {
      return User.create({
        body: {
          emailAddress,
          givenName,
          familyName
        }
      })
      .then(user =>
        knex.select().from('users').where('emailAddress', emailAddress)
      )
      .then(users => {
        const user = users[0]
        assert(user, 'No user was created.')
        createdIds.push(user.id)
        assert(mockEmailer.withArgs(emailAddress).calledOnce, 'The emailer was not called.')
        const passwordResetKey = mockEmailer.getCall(0).args[2].match(/(?:setPassword\?emailAddress=.*&key=)([A-Za-z\d]{30})/)[1]
        const emailAddressFromEmail = mockEmailer.getCall(0).args[2].match(/(?:setPassword\?emailAddress=)(.*)(&key=[A-Za-z\d]{30})/)[1]
        assert(bcrypt.compareSync(passwordResetKey, user.passwordResetKeyHash), 'The email contained the wrong password reset key.')
        assert.strictEqual(emailAddressFromEmail, emailAddress, 'The email contained the wrong email address parameter.')
      })
    })

    it('should make a user active by default', () => {
      return User.create({
        body: {
          emailAddress,
          givenName,
          familyName
        }
      })
      .then(user => {
        return knex.select().from('users').where('emailAddress', emailAddress)
      })
      .then(users => {
        createdIds.push(users[0].id)
        assert(users[0].active, 'The user is not active.')
      })
    })

    it('should reject non-creation attributes', () => {
      return User.create({
        body: {
          emailAddress,
          givenName,
          familyName,
          active: false
        }
      })
      .then(function (user) {
        return knex.select().from('users').where('emailAddress', emailAddress)
      })
      .then(function (users) {
        createdIds.push(users[0].id)
        assert(false, 'The creation succeeded.')
      })
      .catch(err => {
        if (err instanceof ValidationError) {
          assert(err.messages.active)
        } else {
          throw err
        }
      })
    })

    it('should fail when the email address is omitted', () =>
      User.create({
        body: {
          givenName,
          familyName
        }
      })
      .then(user => {
        assert(false, 'The creation succeeded.')
      })
      .catch(err => {
        if (err instanceof ValidationError) {
          assert(err.messages.emailAddress)
        } else {
          throw err
        }
      })
    )

    it('should fail when the given name is omitted', () =>
      User.create({
        body: {
          emailAddress,
          familyName
        }
      })
      .then(user => {
        assert(false, 'The creation succeeded.')
      })
      .catch(err => {
        if (err instanceof ValidationError) {
          assert(err.messages.givenName)
        } else {
          throw err
        }
      })
    )

    it('should fail when the family name is omitted', () =>
      User.create({
        body: {
          emailAddress,
          givenName
        }
      })
      .then(user => {
        assert(false, 'The creation succeeded.')
      })
      .catch(err => {
        if (err instanceof ValidationError) {
          assert(err.messages.familyName)
        } else {
          throw err
        }
      })
    )

    it('should fail when the email address is not unique', () => {
      return knex.into('users').insert({
        emailAddress,
        givenName,
        familyName
      }).returning('id').then(function (ids) {
        createdIds.push(ids[0])
        return User.create({
          body: {
            emailAddress: emailAddress.toUpperCase()
          }
        })
      }).then(user => {
        createdIds.push(user.id)
        assert(false, 'The creation succeeded.')
      })
      .catch(err => {
        if (err instanceof ConflictingEditError) {
        } else {
          throw err
        }
      })
    })

    it('should fail with an invalid email address', () => {
      return User.create({
        body: {
          emailAddress: badEmailAddress,
          givenName,
          familyName
        }
      }).then(user => {
        createdIds.push(user.id)
        assert(false, 'The creation succeeded.')
      })
      .catch(err => {
        if (err instanceof ValidationError) {
        } else {
          throw err
        }
      })
    })

    it('should fail with a failing emailer', () => {
      mockEmailer.err = new EmailerError()
      return User.create({
        body: {
          emailAddress,
          givenName,
          familyName
        }
      }).then(user =>
        knex.select().from('users').where('emailAddress', emailAddress)
      ).then(users => {
        createdIds.push(users[0].id)
        assert(!mockEmailer.called, 'The password setting email was sent.')
        assert(false, 'The creation did not fail.')
      })
      .catch(err => {
        if (err instanceof EmailerError) {
        } else {
          throw err
        }
      })
    })

  })

  describe('read', () => {
    const emailAddress = 'mocha.test.email.address@not.a.real.domain.com'
    const password = 'taco tuesday'
    const givenName1 = 'James'
    const givenName2 = 'Paula'
    const familyName1 = 'Deen'
    const familyName2 = 'Poundstone'
    const timeZone = 'Europe/Moscow'
    const searchableUsers = [{
      emailAddress: '0' + emailAddress,
      givenName: givenName1,
      familyName: familyName1,
      authorisedToBlog: false,
      timeZone
    }, {
      emailAddress: '1' + emailAddress,
      givenName: givenName2,
      familyName: familyName2,
      authorisedToBlog: true,
      timeZone
    }, {
      emailAddress: '2' + emailAddress,
      givenName: givenName2,
      familyName: familyName1,
      authorisedToBlog: true,
      timeZone
    }, {
      emailAddress: '3' + emailAddress,
      givenName: givenName1,
      familyName: familyName2,
      authorisedToBlog: false,
      timeZone
    }]

    beforeEach('Create the searchable users.', () => {
      return knex.into('users').insert(searchableUsers).returning('id')
        .then(function (returnedIds) {
          Array.prototype.push.apply(createdIds, returnedIds)
        })
    })

    it('should be able to look up by userId', () => {
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
          timeZone: searchableUsers[0].timeZone,
          active: true,
          authorisedToBlog: false
        }, 'The returned user was incorrect.')
      })
    })

    it('should fail to look up a non-existent user.', () => {
      //Create a user, store his ID, then delete the user.
      let badId
      return knex.into('users').insert({
        emailAddress: 'different' + emailAddress
      }).returning('id').then(function (ids) {
        badId = ids[0]
        return knex.from('users').where('id', badId).del()
      }).then(() => {

        // Try to read the user.
        return User.read({
          params: {
            userId: badId
          }
        })
      }).then(function (user) {
        assert(false, 'The read succeeded.')
      })
      .catch(err => {
        if (err instanceof NoSuchResourceError) {
        } else {
          throw err
        }
      })
    })

    it('should fail to authenticate with an unassigned email address', () => {
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
      })
      .catch(err => {
        if (err instanceof AuthenticationError) {
        } else {
          throw err
        }
      })
    })

    it('should fail to authenticate with a wrong password', () => {
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
      })
      .catch(err => {
        if (err instanceof AuthenticationError) {
        } else {
          throw err
        }
      })
    })

    describe('search', () => {

      it('should be able to list all users', () => {
        let count
        return knex.from('users').count('id')
          .then(function (result) {
            count = Number.parseInt(result[0].count)
          })
          .then(() => {
            return User.read({
              params: {}
            })
          })
          .then(function (users) {
            assert.strictEqual(users.length, count, 'The wrong number of users was returned.')
          })
      })

      it('should be able to sort the list by family name, descending', () => {
        let count
        return knex.from('users').count('id')
          .then(function (result) {
            count = Number.parseInt(result[0].count)
          })
          .then(() => {
            return User.read({
              query: {
                sortBy: 'familyName',
                sortOrder: 'descending'
              }
            })
          }).then(function (users) {
            assert.strictEqual(users.length, count, 'The wrong number of users was returned.')
            for (let i = 0; i < users.length - 1; ++i) {
              const inOrder = (users[i].familyName >= users[i + 1].familyName)
              const notNull = (users[i].familyName && users[i + 1].familyName)
              assert((!notNull) || inOrder, 'The returned users were in the wrong order.')
            }
          })
      })

      it('should be able to sort the list by family name, ascending', () => {
        let count
        return knex.from('users').count('id')
          .then(function (result) {
            count = Number.parseInt(result[0].count)
          })
          .then(() => {
            return User.read({
              query: {
                sortBy: 'familyName',
                sortOrder: 'ascending'
              }
            })
          })
          .then(function (users) {
            assert.strictEqual(users.length, count, 'The wrong number of users was returned.')
            for (let i = 0; i < users.length - 1; ++i) {
              const inOrder = (users[i].familyName <= users[i + 1].familyName)
              const notNull = (users[i].familyName && users[i + 1].familyName)
              assert((!notNull) || inOrder, 'The returned users were in the wrong order.')
            }
          })
      })

      it('should fail to sort the list by a bad attribute', () => {
        return User.read({
          query: {
            sortBy: 'active', // not sortrable
            sortOrder: 'ascending'
          }
        })
        .then(function (users) {
          assert(false, 'The read succeeded.')
        })
        .catch(err => {
          if (err instanceof ValidationError) {
            if (Object.keys(err.messages).length !== 1
              || !err.messages.sortBy
              || err.messages.sortBy.length !== 1) {
              throw err
            }
          } else {
            throw err
          }
        })
      })

      it('should be able to search by family name', () => {
        return User.read({
          query: {
            familyName: familyName1
          }
        })
        .then(function (users) {
          assert.strictEqual(users.length, 2, 'The wrong number of users was returned.')
          for (let i in users) {
            assert.strictEqual(users[i].familyName, familyName1, 'The wrong users were returned.')
          }
        })
      })

      it('should be able to search by partial, lower-case family name', () => {
        return User.read({
          query: {
            familyName: familyName1.substr(0, 3).toLowerCase()
          }
        })
        .then(function (users) {
          assert.strictEqual(users.length, 2, 'The wrong number of users was returned.')
          for (let i in users) {
            assert.strictEqual(users[i].familyName, familyName1, 'The wrong users were returned.')
          }
        })
      })

      it('should fail to search by family name using like expressions', () => {
        return User.read({
          query: {
            familyName: familyName1.replace('e', '_')
          }
        })
        .then(function (users) {
          assert.strictEqual(users.length, 0, 'The wrong number of users was returned.')
        })
      })

      it('should be able to search by family name and given name', () => {
        return User.read({
          query: {
            familyName: familyName1,
            givenName: givenName1
          }
        })
        .then(function (users) {
          assert.strictEqual(users.length, 1, 'The wrong number of users was returned.')
          assert.strictEqual(users[0].givenName, givenName1, 'The returned user has the wrong given name.')
          assert.strictEqual(users[0].familyName, familyName1, 'The returned user has the wrong family name.')
        })
      })

      it('should be able to search by family name and sort by given name, descending', () => {
        return User.read({
          query: {
            familyName: familyName1,
            sortBy: 'givenName',
            sortOrder: 'descending'
          }
        })
        .then(function (users) {
          assert.strictEqual(users.length, 2, 'The wrong number of users was returned.')
          for (let i in users) {
            assert.strictEqual(users[i].familyName, familyName1, 'The wrong users were returned.')
          }
          assert.strictEqual(users[0].givenName, givenName2, 'The wrong user was first.')
        })
      })

      it('should be able to search by family name and sort by given name, ascending', () => {
        return User.read({
          query: {
            familyName: familyName1,
            sortBy: 'givenName',
            sortOrder: 'ascending'
          }
        })
        .then(function (users) {
          assert.strictEqual(users.length, 2, 'The wrong number of users was returned.')
          for (let i in users) {
            assert.strictEqual(users[i].familyName, familyName1, 'The wrong users were returned.')
          }
          assert.strictEqual(users[0].givenName, givenName1, 'The wrong user was first.')
        })
      })

      it('should be able to search by blog authorisation and sort by family name, ascending', () => {
        return User.read({
          query: {
            authorisedToBlog: true,
            sortBy: 'familyName',
            sortOrder: 'ascending'
          }
        })
        .then(function (users) {
          assert.strictEqual(users.length, 2, 'The wrong number of users was returned.')
          for (let i in users) {
            assert(users[i].authorisedToBlog, 'The wrong users were returned.')
          }
          assert.strictEqual(users[0].familyName, familyName1, 'The wrong user was first.')
        })
      })

      it('should fail to search by email address', () => {
        return User.read({
          query: {
            emailAddress: emailAddress
          }
        })
        .then(function (users) {
          assert(false, 'The read succeeded')
        })
        .catch(err => {
          if (err instanceof ValidationError) {
            if (Object.keys(err.messages).length !== 1
              || !err.messages.emailAddress
              || err.messages.emailAddress.length !== 1) {
              throw err
            }
          } else {
            throw err
          }
        })
      })

      it('should fail to search with a malformed query', () => {
        return User.read({
          query: {
            familyName: familyName1,
            notARealAttribute: 'hello'
          }
        })
        .then(() => {
          assert(false, 'The read succeeded.')
        })
        .catch(err => {
          if (err instanceof ValidationError) {
            if (Object.keys(err.messages).length !== 1
              || !err.messages.notARealAttribute
              || err.messages.notARealAttribute.length !== 1) {
              throw err
            }
          } else {
            throw err
          }
        })
      })

      it('should fail to search with a userId', () => {
        return User.read({
          params: {
            userId: createdIds[0]
          },
          query: {
            familyName: familyName1
          }
        })
        .then(() => {
          assert(false, 'The read succeeded.')
        })
        .catch(err => {
          if (err instanceof MalformedRequestError) {
          } else {
            throw err
          }
        })
      })
    })

    context('as an admin', () => {
      const adminUser = {
        emailAddress: 'mocha.test.admin@example.com',
        password: 'I do what I want.'
      }

      beforeEach(() => {
        return knex.into('users').insert({
          emailAddress: adminUser.emailAddress,
          passwordHash: bcrypt.hashSync(adminUser.password, bcrypt.genSaltSync(8)),
          admin: true,
          active: true
        })
        .returning('id')
        .then(function (ids) {
          createdIds.push(ids[0])
        })
      })

      it('should be able to search by email address', () => {
        return User.read({
          query: {
            emailAddress: searchableUsers[0].emailAddress
          },
          auth: adminUser
        })
        .then(function (users) {
          assert.strictEqual(users.length, 1, 'The wrong number of users was returned.')
          for (let i in users) {
            assert.strictEqual(users[i].emailAddress, searchableUsers[0].emailAddress, 'The wrong users were returned.')
          }
        })
      })

    })

  })

  describe('update', () => {
    const emailAddress = 'mocha.test.email.address@not.a.real.domain.com'
    const badEmailAddress = 'NotAValidEmailAddress.com'
    const password = 'taco tuesday'
    const givenName = 'Victor'
    const familyName = 'Frankenstein'
    const passwordHash = bcrypt.hashSync(password, bcrypt.genSaltSync(8))
    const timeZone = 'Europe/Moscow'

    beforeEach('Create a user to be updated.', () => {
      return knex.into('users').insert({
        emailAddress: emailAddress,
        passwordHash: passwordHash
      }).returning('id').then(function (ids) {
        createdIds.push(ids[0])
      })
    })

    it('should be able to set a password while authenticated', () => {
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
      }).then(() => {
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

    it('should fail to set a too short password', () => {
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
      })
      .then(() => {
        assert(false, 'The update succeeded.')
      })
      .catch(err => {
        if (err instanceof ValidationError) {
          if (Object.keys(err.messages).length !== 1
            || !err.messages.password
            || err.messages.password.length !== 1) {
            throw err
          }
        } else {
          throw err
        }
      })
    })

    it('should fail to set a too long password', () => {
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
      })
      .then(() => {
        assert(false, 'The update succeeded.')
      })
      .catch(err => {
        if (err instanceof ValidationError) {
          if (Object.keys(err.messages).length !== 1
            || !err.messages.password
            || err.messages.password.length !== 1) {
            throw err
          }
        } else {
          throw err
        }
      })
    })

    it('should fail to set a property that users do not have', () => {
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
      })
      .then(() => {
        assert(false, 'The update succeeded.')
      })
      .catch(err => {
        if (err instanceof ValidationError) {
          if (Object.keys(err.messages).length !== 1
            || !err.messages.notARealAttribute
            || err.messages.notARealAttribute.length !== 1) {
            throw err
          }
        } else {
          throw err
        }
      })
    })

    it('should be able to upload an avatar', () =>
      User
        .update({
          auth: {
            emailAddress: emailAddress,
            password: password
          },
          params: {
            userId: createdIds[0]
          },
          body: {
            avatar: goodAvatar
          }
        })
        .then(() =>
          knex
            .from('users')
            .select('avatar')
            .where({
              id: createdIds[0]
            })
        )
        .then(rows => rows[0].avatar)
        .then(avatar => {
          let base64Data = Buffer.from(avatar, 'hex').toString('base64')
          let expectedData = processedAvatar.split(',')[1]
          assert.strictEqual(base64Data, expectedData, 'The avatar was wrong.')
        })
    )

    it('should be able to clear an avatar', () =>
      User
        .update({
          auth: {
            emailAddress: emailAddress,
            password: password
          },
          params: {
            userId: createdIds[0]
          },
          body: {
            avatar: null
          }
        })
        .then(() =>
          knex
            .from('users')
            .select('avatar')
            .where({
              id: createdIds[0]
            })
        )
        .then(rows => rows[0].avatar)
        .then(avatar => {
          assert.strictEqual(avatar, null, 'The avatar was wrong.')
        })
    )

    it('should not change the contents of an already processed avatar', () =>
      User
        .update({
          auth: {
            emailAddress: emailAddress,
            password: password
          },
          params: {
            userId: createdIds[0]
          },
          body: {
            avatar: processedAvatar
          }
        })
        .then(() =>
          knex
            .from('users')
            .select('avatar')
            .where({
              id: createdIds[0]
            })
        )
        .then(rows => rows[0].avatar)
        .then(avatar => {
          let base64Data = Buffer.from(avatar, 'hex').toString('base64')
          let expectedData = processedAvatar.split(',')[1]
          assert.strictEqual(base64Data, expectedData, 'The avatar was wrong.')
        })
    )

    it('should fail to update with a too large avatar', () =>
      User
        .update({
          auth: {
            emailAddress: emailAddress,
            password: password
          },
          params: {
            userId: createdIds[0]
          },
          body: {
            avatar: tooLargeAvatar
          }
        })
        .then(() => {
          assert(false, 'The update succeeded.')
        })
        .catch(err => {
          if (err instanceof ValidationError) {
            assert(err.messages.avatar)
          } else {
            throw err
          }
        })
    )

    it('should fail to update with an avatar that is not convertible into a JPEG', () =>
      User
        .update({
          auth: {
            emailAddress: emailAddress,
            password: password
          },
          params: {
            userId: createdIds[0]
          },
          body: {
            avatar: notAnImageAvatar
          }
        })
        .then(() => {
          assert(false, 'The update succeeded.')
        })
        .catch(err => {
          if (err instanceof ValidationError) {
            assert(err.messages.avatar)
          } else {
            throw err
          }
        })
    )

    it('should be able to set an email address', () => {
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

    it('should fail to set an improper email address', () => {
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
      })
      .then(function (user) {
        assert.notStrictEqual(user.emailAddress, badEmailAddress, 'The email address was set to "' + badEmailAddress + '".')
        assert(false, 'The update succeeded.')
      })
      .catch(err => {
        if (err instanceof ValidationError) {
          if (Object.keys(err.messages).length !== 1
          || !err.messages.emailAddress
          || err.messages.emailAddress.length !== 1) {
            throw err
          }
        } else {
          throw err
        }
      })
    })

    it('should fail to set an email address without authenticating', () => {
      return User.update({
        params: {
          userId: createdIds[0]
        },
        body: {
          emailAddress: emailAddress
        }
      })
      .then(() => {
        assert(false, 'The update succeeded.')
      })
      .catch(err => {
        if (err instanceof AuthenticationError) {
        } else {
          throw err
        }
      })
    })

    it('should fail to remove an email address', () =>
      User.update({
        auth: {
          emailAddress: emailAddress,
          password: password
        },
        params: {
          userId: createdIds[0]
        },
        body: {
          emailAddress: null
        }
      })
      .then(() => {
        assert(false, 'The update succeeded.')
      })
      .catch(err => {
        if (err instanceof ValidationError) {
          assert(err.messages.emailAddress)
        } else {
          throw err
        }
      })
    )

    it('should fail to remove an email address', () =>
      User.update({
        auth: {
          emailAddress: emailAddress,
          password: password
        },
        params: {
          userId: createdIds[0]
        },
        body: {
          emailAddress: ''
        }
      })
      .then(() => {
        assert(false, 'The update succeeded.')
      })
      .catch(err => {
        if (err instanceof ValidationError) {
          assert(err.messages.emailAddress)
        } else {
          throw err
        }
      })
    )

    it('should fail to remove a given name', () =>
      User.update({
        auth: {
          emailAddress: emailAddress,
          password: password
        },
        params: {
          userId: createdIds[0]
        },
        body: {
          givenName: null
        }
      })
      .then(() => {
        assert(false, 'The update succeeded.')
      })
      .catch(err => {
        if (err instanceof ValidationError) {
          assert(err.messages.givenName)
        } else {
          throw err
        }
      })
    )

    it('should fail to set an empty given name', () =>
      User.update({
        auth: {
          emailAddress: emailAddress,
          password: password
        },
        params: {
          userId: createdIds[0]
        },
        body: {
          givenName: ''
        }
      })
      .then(() => {
        assert(false, 'The update succeeded.')
      })
      .catch(err => {
        if (err instanceof ValidationError) {
          assert(err.messages.givenName)
        } else {
          throw err
        }
      })
    )

    it('should fail to remove a family name', () =>
      User.update({
        auth: {
          emailAddress: emailAddress,
          password: password
        },
        params: {
          userId: createdIds[0]
        },
        body: {
          familyName: null
        }
      })
      .then(() => {
        assert(false, 'The update succeeded.')
      })
      .catch(err => {
        if (err instanceof ValidationError) {
          assert(err.messages.familyName)
        } else {
          throw err
        }
      })
    )

    it('should fail to set an empty family name', () =>
      User.update({
        auth: {
          emailAddress: emailAddress,
          password: password
        },
        params: {
          userId: createdIds[0]
        },
        body: {
          familyName: ''
        }
      })
      .then(() => {
        assert(false, 'The update succeeded.')
      })
      .catch(err => {
        if (err instanceof ValidationError) {
          assert(err.messages.familyName)
        } else {
          throw err
        }
      })
    )

    it('should be able to set inactive', () => {
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

    it('should be able to set active', () => {
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

    it('should be able to set a given name and family name', () => {
      return User.update({
        auth: {
          emailAddress: emailAddress,
          password: password
        },
        params: {
          userId: createdIds[0]
        },
        body: {
          givenName,
          familyName: familyName
        }
      })
    })

    it('should be able to set a time zone', () => {
      return User.update({
        auth: {
          emailAddress: emailAddress,
          password: password
        },
        params: {
          userId: createdIds[0]
        },
        body: {
          timeZone
        }
      })
      .then(result => {
        assert.strictEqual(result.timeZone, timeZone, 'The time zone was not set correctly.')
      })
    })

    it('should fail to remove a time zone', () =>
      User.update({
        auth: {
          emailAddress: emailAddress,
          password: password
        },
        params: {
          userId: createdIds[0]
        },
        body: {
          timeZone: null
        }
      })
      .then(() => {
        assert(false, 'The update succeeded.')
      })
      .catch(err => {
        if (err instanceof ValidationError) {
          assert(err.messages.timeZone)
        } else {
          throw err
        }
      })
    )

    it('should fail to set an empty time zone', () =>
      User.update({
        auth: {
          emailAddress: emailAddress,
          password: password
        },
        params: {
          userId: createdIds[0]
        },
        body: {
          timeZone: ''
        }
      })
      .then(() => {
        assert(false, 'The update succeeded.')
      })
      .catch(err => {
        if (err instanceof ValidationError) {
          assert(err.messages.timeZone)
        } else {
          throw err
        }
      })
    )


    context('as an admin', () => {
      const adminUser = {
        emailAddress: 'mocha.test.admin@example.com',
        password: 'I do what I want.'
      }

      beforeEach(() => {
        return knex.into('users').insert({
          emailAddress: adminUser.emailAddress,
          passwordHash: bcrypt.hashSync(adminUser.password, bcrypt.genSaltSync(8)),
          admin: true,
          active: true
        }).returning('id').then(function (ids) {
          createdIds.push(ids[0])
        })
      })

      it('should be able to modify the given name of another user', () => {
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

      it('should be able to make another user an admin', () => {
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

      it('should be able to make another user a blogger', () => {
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

    context('while authenticated as someone else', () => {
      const otherEmailAddress = 'somethingElse' + emailAddress

      beforeEach('Create the other user to edit.', () => {
        return knex.into('users').insert({
          emailAddress: otherEmailAddress
        }).returning('id').then(function (ids) {
          createdIds.push(ids[0])
        })
      })

      it('should fail to set inactive', () => {
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
        })
        .then(() => {
          assert(false, 'The update succeeded.')
        })
        .catch(err => {
          if (err instanceof AuthorisationError) {
          } else {
            throw err
          }
        })
      })

      it('should fail to set a password', () => {
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
        })
        .then(() => {
          assert(false, 'The update succeeded.')
        })
        .catch(err => {
          if (err instanceof AuthorisationError) {
          } else {
            throw err
          }
        })
      })

    })

    context('when the user does not exist', () => {
      const otherEmailAddress = 'somethingElse' + emailAddress
      let badId

      beforeEach('Get an unassigned ID.', () => {
        //Create a user, store his ID, then delete the user.
        return knex.into('users').insert({
          emailAddress: otherEmailAddress
        })
        .returning('id')
        .then(function (ids) {
          badId = ids[0]
          return knex.from('users').where('id', badId).del()
        })
      })

      it('should fail to set an email address', () => {
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
        })
        .then(() => {
          assert(false, 'The update did not fail.')
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

  describe('setPassword', () => {
    const emailAddress = 'mocha.test.email.address@not.a.real.domain.com'
    const password = 'taco tuesday'
    const passwordHash = bcrypt.hashSync(password, bcrypt.genSaltSync(8))

    beforeEach('Create a user to be updated.', () =>
    knex.into('users').insert({
      emailAddress: emailAddress,
      passwordHash: passwordHash
    })
    .returning('id')
    .then(ids => createdIds.push(ids[0]))
  )

    it('should be able to send a password reset email', () =>
      User.setPassword({
        body: {
          emailAddress: emailAddress,
          passwordResetKey: null
        }
      })
      .then(() => {
        assert(mockEmailer.calledOnce, 'The emailer was not called.')
      })
    )

    it('should be able to send a password reset email with an all-caps email address', () => {
      return User.setPassword({
        body: {
          emailAddress: emailAddress.toUpperCase(),
          passwordResetKey: null
        }
      })
      .then(() => {
        assert(mockEmailer.calledOnce, 'The emailer was not called.')
      })
    })

    it('should fail to send a password reset email with a failing emailer', () => {
      mockEmailer.err = new EmailerError()
      return User.setPassword({
        body: {
          emailAddress: emailAddress,
          passwordResetKey: null
        }
      })
      .then(user => {
        assert(false, 'The email was sent.')
      })
      .catch(err => {
        if (err instanceof EmailerError) {
        } else {
          throw err
        }
      })
    })

    context('after password reset email', () => {
      const passwordResetKey = {
        key: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcd'
      }
      passwordResetKey.hash = bcrypt.hashSync(passwordResetKey.key, bcrypt.genSaltSync(8))

      beforeEach('Set the password reset key.', () =>
        knex.into('users').where('id', createdIds[0]).update({
          passwordResetKeyHash: passwordResetKey.hash
        })
      )

      it('should be able to set a password anonymously with a key', () =>
        User.setPassword({
          body: {
            emailAddress,
            passwordResetKey: passwordResetKey.key,
            password
          }
        })
      )

      it('should not be able to resuse the password reset key', () => {
        let completedFirstUpdate = false
        return User.setPassword({
          body: {
            emailAddress,
            passwordResetKey: passwordResetKey.key,
            password
          }
        })
        .then(() => {
          completedFirstUpdate = true
          return User.setPassword({
            body: {
              emailAddress,
              passwordResetKey: passwordResetKey.key,
              password
            }
          })
        })
        .then(() => {
          assert(false, 'The update succeeded.')
        })
        .catch(err => {
          if (err instanceof AuthenticationError) {
            assert(completedFirstUpdate, 'The second update failed.')
          } else {
            throw err
          }
        })
      })

      it('should fail to set a password with an incorrect key', () =>
        User.setPassword({
          params: {
            userId: createdIds[0]
          },
          body: {
            emailAddress,
            password,
            passwordResetKey: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabce'
          }
        })
        .then(() => {
          assert(false, 'The update succeeded.')
        })
        .catch(err => {
          if (err instanceof AuthenticationError) {
          } else {
            throw err
          }
        })
      )

    })

    context('when the user does not exist', () => {
      const otherEmailAddress = 'somethingElse' + emailAddress
      let badId

      beforeEach('Get an unassigned ID.', () => {
        //Create a user, store his ID, then delete the user.
        return knex.into('users').insert({
          emailAddress: otherEmailAddress
        })
        .returning('id')
        .then(function (ids) {
          badId = ids[0]
          return knex.from('users').where('id', badId).del()
        })
      })

      it('should fail to do an anonymous password reset', () =>
        User.setPassword({
          body: {
            emailAddress: otherEmailAddress,
            passwordResetKey: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcd',
            password
          }
        })
        .then(() => {
          assert(false, 'The update did not fail.')
        })
        .catch(err => {
          if (err instanceof NoSuchResourceError) {
          } else {
            throw err
          }
        })
      )

      it('should fail to send a password reset email', () =>
        User.setPassword({
          body: {
            emailAddress: otherEmailAddress,
            passwordResetKey: null
          }
        })
        .then(() => {
          assert(!mockEmailer.called, 'The emailer was called.')
          assert(false, 'The update did not fail.')
        })
        .catch(err => {
          if (err instanceof NoSuchResourceError) {
          } else {
            throw err
          }
        })
      )

    })

  })

  describe('serveAvatar', () => {

    const emailAddress = 'mocha.test.email.address@not.a.real.domain.com'
    const password = 'taco tuesday'
    const passwordHash = bcrypt.hashSync(password, bcrypt.genSaltSync(8))

    beforeEach('Create a user with an avatar.', () => {
      return knex.into('users').insert({
        emailAddress: emailAddress,
        passwordHash: passwordHash,
        avatar: '\\x' + hexGoodAvatar
      }).returning('id').then(function (ids) {
        createdIds.push(ids[0])
      })
    })

    it('should serve the proper avatar when one exists', () =>
      User
        .serveAvatar({
          params: {
            userId: createdIds[0]
          }
        })
        .then(avatar => {
          assert.strictEqual(avatar.toString('hex'), hexGoodAvatar, 'The wrong avatar was returned.')
        })
    )

    it('should serve the default avatar when no avatar exists', () =>
      knex
        .into('users')
        .where({
          id: createdIds[0]
        })
        .update({
          avatar: null
        })
        .then(() =>
          User
            .serveAvatar({
              params: {
                userId: createdIds[0]
              }
            })
            .then(avatar => {
              assert.strictEqual(Buffer.compare(avatar, defaultAvatar), 0, 'The wrong avatar was returned.')
            })
        )
    )

  })

})
