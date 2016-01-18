var _ = require('lodash');
var assert = require('assert');
var Promise = require('bluebird');
var bcrypt = Promise.promisifyAll(require('bcrypt'));
var knex = require('../../../server/database/knex');
var InfoPage = require('../../../server/biz/infoPage')(knex);
var AuthorisationError = require('../../../server/errors/authorisationError');
var NoSuchResourceError = require('../../../server/errors/noSuchResourceError');


describe('infoPage', function () {
  var ids = ['home'];
  var badId = 'notARealPage';
  var body = 'This is the text of a page.';
  var otherBody = 'This is another bit of text.';
  var admin = {
    emailAddress: 'admin.mocha.test.email.address@not.a.real.domain.com',
    password: 'taco tuesday',
    passwordHash: bcrypt.hashSync('taco tuesday', 8)
  };
  var notAdmin = {
    emailAddress: 'mocha.test.email.address@not.a.real.domain.com',
    password: 'taco tuesday',
    passwordHash: bcrypt.hashSync('taco tuesday', 8)
  };

  beforeEach('Create info pages.', function () {
    var pages = _.map(ids, function (id) {
      return {
        id: id,
        body: body
      };
    });
    return knex
      .into('infoPages')
      .insert(pages);
  });

  beforeEach('Create the users.', function () {
    return knex
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
      ]).returning('id').then(function (returnedIds) {
        admin.id = returnedIds[0];
        notAdmin.id = returnedIds[1];
      });
  });

  afterEach('Delete the users.', function () {
    return knex
      .from('users')
      .where('id', 'in', [admin.id, notAdmin.id])
      .del();
  });

  afterEach('Delete info pages.', function () {
    return knex
      .from('infoPages')
      .where('id', 'in', ids)
      .del();
  });

  describe('read', function () {

    it('should be able to read a page anonymously', function () {
      return InfoPage.read({
        params: {
          pageId: ids[0]
        }
      }).then(function (page) {
        assert.deepEqual(page, {
          title: '',
          body: body
        }, 'The returned page was wrong.');
      });
    });

    it('should be able to read a page as an admin user', function () {
      return InfoPage.read({
        params: {
          pageId: ids[0]
        },
        auth: {
          emailAddress: admin.emailAddress,
          password: admin.password
        }
      }).then(function (page) {
        assert.deepEqual(page, {
          title: '',
          body: body
        }, 'The returned page was wrong.');
      });
    });

    it('should be able to read a page as a not admin user', function () {
      return InfoPage.read({
        params: {
          pageId: ids[0]
        },
        auth: {
          emailAddress: notAdmin.emailAddress,
          password: notAdmin.password
        }
      }).then(function (page) {
        assert.deepEqual(page, {
          title: '',
          body: body
        }, 'The returned page was wrong.');
      });
    });

    it('should fail to read a non-existent page', function () {
      return InfoPage.read({
        params: {
          pageId: badId
        }
      }).then(function (page) {
        assert(false, 'The read succeeded.');
      }).catch(NoSuchResourceError, function () {});
    });

  });

  describe('update', function () {

    it('should fail to update a page anonymously', function () {
      return InfoPage.update({
        params: {
          pageId: ids[0]
        },
        body: {
          body: otherBody
        }
      }).then(function (page) {
        assert(false, 'The update succeeded.');
      }).catch(AuthorisationError, function () {});
    });

    it('should be able to update a page as an admin user', function () {
      return InfoPage.update({
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
      }).then(function (page) {
        assert.deepEqual(page, {
          title: '',
          body: otherBody
        }, 'The returned page was wrong.');
      });
    });

    it('should fail to update a page as a not admin user', function () {
      return InfoPage.update({
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
      }).then(function (page) {
        assert(false, 'The update succeeded.');
      }).catch(AuthorisationError, function () {});
    });

    it('should fail to update a non-existent page', function () {
      return InfoPage.update({
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
      }).then(function (page) {
        assert(false, 'The update succeeded.');
      }).catch(NoSuchResourceError, function () {});
    });

  });

});
