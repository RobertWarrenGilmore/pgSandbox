var assert = require('assert');
var mockBookshelf = require('./mockBookshelf');
var mockEmailer = require('./mockEmailer');

describe('business logic', function () {

  describe('mock objects', function () {

    it('should have a working mock Bookshelf', function (done) {
      var Model = mockBookshelf.model('Dummy', ['extraStub']);
      var model1 = new Model();
      var model2 = new Model();

      assert.strictEqual(Model.callCount, 2, 'The model constructor was not called twice.');

      model1.save();

      assert(model1.save.called, 'model1.save() was not called.');
      assert(!(model2.save.called), 'model2.save() was called.');

      model1.extraStub();

      assert(model1.extraStub.called, 'model1.extraStub() was not called.');
      assert(!(model2.extraStub.called), 'model2.extraStub() was called.');

      done();
    });

    it('should have a working mock emailer', function (done) {
      var emailAddress = 'email@address.com';
      var message = 'This is a message.';
      mockEmailer(emailAddress, message);

      assert(mockEmailer.withArgs(emailAddress, message).calledOnce, 'The emailer was not called properly.');

      done();
    });

  });
  
  context('unit', function () {
    // a list of all of the business logic test modules
    require('./user.unit');
  });
});
