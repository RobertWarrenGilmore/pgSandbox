var sinon = require('sinon');

var models = {};

var createModelClass = function (extraStubs) {
  var instances = [];
  var Model = function () {
    var instance;
    // Return either a new instance or the next queued instance.
    if (instances.length) {
      instance = instances.unshift();
    } else {
      sinon.spy(this, 'save');
      sinon.spy(this, 'fetch');
      sinon.spy(this, 'set');
      sinon.stub(this, 'get');
      sinon.stub(this, 'serialize');
      if (extraStubs) {
        for (var extraStub of extraStubs) {
          sinon.stub(this, extraStub);
        }
      }
      instance = this;
    }
    return instance;
  };
  // This method allows us to queue up pre-made instances to be returned by subsequent constructor calls.
  Model.queueInstances = function (count) {
    var queued = [];
    for (var i = 0; i < count; ++i) {
      var instance = new Model();
      instances.push(instance);
      queued.push(instance);
    }
    return queued;
  }
  Model.clearInstances = function () {
    instances.length = 0;
  };
  Model.prototype.save = function () {
    return Promise.resolve(this);
  };
  Model.prototype.fetch = function () {
    return Promise.resolve(this);
  };
  Model.prototype.set = function () {
    return this;
  };
  Model.prototype.get = function () {
    throw new Error('This method should have been stubbed.');
  };
  Model.prototype.serialize = function () {
    throw new Error('This method should have been stubbed.');
  };
  if (extraStubs) {
    for (var extraStub of extraStubs) {
      Model.prototype[extraStub] = function () {
        throw new Error('This method should have been stubbed.');
      };
    }
  }
  return sinon.spy(Model);
};

var mockBookshelf = {
  model: function (name, extraStubs) {
    if (!models[name]) {
      models[name] = createModelClass(extraStubs);
    }
    return models[name];
  }
};

module.exports = mockBookshelf;
