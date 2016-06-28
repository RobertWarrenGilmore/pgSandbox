'use strict'
const assert = require('assert')
const bcrypt = require('bcrypt')
const knex = require('../../../api/database/knex')
const InfoPage = require('../../../api/biz/infoPages')(knex)
const AuthorisationError = require('../../../errors/authorisationError')
const NoSuchResourceError = require('../../../errors/noSuchResourceError')


describe('info pages', () => {
  const ids = ['home']
  const badId = 'notARealPage'
  const body = 'This is the text of a page.'
  const otherBody = 'This is another bit of text.'
  const admin = {
    emailAddress: 'admin.mocha.test.email.address@not.a.real.domain.com',
    password: 'taco tuesday',
    passwordHash: bcrypt.hashSync('taco tuesday', bcrypt.genSaltSync(8))
  }
  const notAdmin = {
    emailAddress: 'mocha.test.email.address@not.a.real.domain.com',
    password: 'taco tuesday',
    passwordHash: bcrypt.hashSync('taco tuesday', bcrypt.genSaltSync(8))
  }

  beforeEach('Create info pages.', () =>
    knex
      .into('infoPages')
      .insert(ids.map(id => ({
        id,
        body
      })))
  )

  beforeEach('Create the users.', () =>
    knex
      .into('users')
      .insert([
        {
          emailAddress: admin.emailAddress,
          passwordHash: admin.passwordHash,
          admin: true
        },
        {
          emailAddress: notAdmin.emailAddress,
          passwordHash: notAdmin.passwordHash,
          admin: false
        }
      ])
      .returning('id')
      .then(returnedIds => {
        admin.id = returnedIds[0]
        notAdmin.id = returnedIds[1]
      })
  )

  afterEach('Delete the users.', () =>
    knex
      .from('users')
      .where('id', 'in', [admin.id, notAdmin.id])
      .del()
  )

  afterEach('Delete info pages.', () =>
    knex
      .from('infoPages')
      .where('id', 'in', ids)
      .del()
  )

  describe('read', () => {

    it('should be able to read a page anonymously', () =>
      InfoPage.read({
        params: {
          pageId: ids[0]
        }
      })
      .then(page => {
        assert.deepEqual(page, {
          title: '',
          body
        }, 'The returned page was wrong.')
      })
    )

    it('should be able to read a page as an admin user', () =>
      InfoPage.read({
        params: {
          pageId: ids[0]
        },
        auth: {
          emailAddress: admin.emailAddress,
          password: admin.password
        }
      })
      .then(page => {
        assert.deepEqual(page, {
          title: '',
          body
        }, 'The returned page was wrong.')
      })
    )

    it('should be able to read a page as a not admin user', () =>
      InfoPage.read({
        params: {
          pageId: ids[0]
        },
        auth: {
          emailAddress: notAdmin.emailAddress,
          password: notAdmin.password
        }
      })
      .then(page => {
        assert.deepEqual(page, {
          title: '',
          body
        }, 'The returned page was wrong.')
      })
    )

    it('should fail to read a non-existent page', () =>
      InfoPage.read({
        params: {
          pageId: badId
        }
      })
      .then(page => {
        assert(false, 'The read succeeded.')
      })
      .catch(err => {
        if (err instanceof NoSuchResourceError) {
        } else {
          throw err
        }
      })
    )

  })

  describe('update', () => {

    it('should fail to update a page anonymously', () =>
      InfoPage.update({
        params: {
          pageId: ids[0]
        },
        body: {
          body: otherBody
        }
      })
      .then(page => {
        assert(false, 'The update succeeded.')
      })
      .catch(err => {
        if (err instanceof AuthorisationError) {
        } else {
          throw err
        }
      })
    )

    it('should be able to update a page as an admin user', () =>
      InfoPage.update({
        params: {
          pageId: ids[0]
        },
        auth: {
          emailAddress: admin.emailAddress,
          password: admin.password
        },
        body: {
          body: otherBody
        }
      })
      .then(page => {
        assert.deepEqual(page, {
          title: '',
          body: otherBody
        }, 'The returned page was wrong.')
      })
    )

    it('should be able to update a page that does not yet exist', () =>
      knex.from('infoPages').where('id', ids[0]).del()
      .then(() =>
        InfoPage.update({
          params: {
            pageId: ids[0]
          },
          auth: {
            emailAddress: admin.emailAddress,
            password: admin.password
          },
          body: {
            body: otherBody
          }
        })
      )
      .then(page => {
        assert.deepEqual(page, {
          title: '',
          body: otherBody
        }, 'The returned page was wrong.')
      })
    )

    it('should fail to update a page as a not admin user', () =>
      InfoPage.update({
        params: {
          pageId: ids[0]
        },
        auth: {
          emailAddress: notAdmin.emailAddress,
          password: notAdmin.password
        },
        body: {
          body: otherBody
        }
      })
      .then(page => {
        assert(false, 'The update succeeded.')
      })
      .catch(err => {
        if (err instanceof AuthorisationError) {
        } else {
          throw err
        }
      })
    )

    it('should fail to update a non-existent page', () =>
      InfoPage.update({
        params: {
          pageId: badId
        },
        auth: {
          emailAddress: admin.emailAddress,
          password: admin.password
        },
        body: {
          body: otherBody
        }
      })
      .then(page => {
        assert(false, 'The update succeeded.')
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
