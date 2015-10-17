var sinon = require('sinon');
var Promise = require('bluebird');

var models = {};

var createModelClass = function (extraStubs) {
  var instances = [];
  var Model = function () {
    var instance;
    // Return either a new instance or the next queued instance.
    if (instances.length) {
      instance = instances.shift();
    } else {
      sinon.stub(this, 'save').returns(Promise.resolve(this));
      sinon.stub(this, 'fetch').returns(Promise.resolve(this));
      sinon.stub(this, 'destroy').returns(Promise.resolve(this));
      sinon.stub(this, 'set').returns(this);
      sinon.stub(this, 'get');
      sinon.stub(this, 'serialize');
      if (extraStubs) {
        for (var i in extraStubs) {
          sinon.stub(this, extraStubs[i]);
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
      queued.push(instance);
    }
    for (var i in queued) {
      instances.push(queued[i]);
    }
    return queued;
  };
  Model.clearInstances = function () {
    instances.length = 0;
  };
  Model.prototype.save = function () {
    throw new Error('This method should have been stubbed.');
  };
  Model.prototype.fetch = function () {
    throw new Error('This method should have been stubbed.');
  };
  Model.prototype.destroy = function () {
    throw new Error('This method should have been stubbed.');
  };
  Model.prototype.set = function () {
    throw new Error('This method should have been stubbed.');
  };
  Model.prototype.get = function () {
    throw new Error('This method should have been stubbed.');
  };
  Model.prototype.serialize = function () {
    throw new Error('This method should have been stubbed.');
  };
  if (extraStubs) {
    for (var i in extraStubs) {
      Model.prototype[extraStubs[i]] = function () {
        throw new Error('This method should have been stubbed.');
      };
    }
  }
  return sinon.spy(Model);
};

var collectionInstances = [];
var Collection = function () {
  var instance;
  // Return either a new instance or the next queued instance.
  if (collectionInstances.length) {
    collectionInstances = collectionInstances.shift();
  } else {
    sinon.stub(this, 'at');
    sinon.stub(this, 'invokeThen').returns(Promise.resolve(this));
    this._items = [];
    instance = this;
  }
  return instance;
};
// This method allows us to queue up pre-made instances to be returned by subsequent constructor calls.
Collection.queueInstances = function (count) {
  var queued = [];
  for (var i = 0; i < count; ++i) {
    var collectionInstance = new Collection();
    queued.push(collectionInstance);
  }
  for (var i in queued) {
    collectionInstances.push(queued[i]);
  }
  return queued;
};
Collection.clearInstances = function () {
  collectionInstances.length = 0;
};
Collection.prototype.at = function () {
  throw new Error('This method should have been stubbed.');
};
Collection.prototype.invokeThen = function () {
  throw new Error('This method should have been stubbed.');
};

var trxs = [];

var mockBookshelf = {
  model: function (name, extraStubs) {
    if (!models[name]) {
      models[name] = createModelClass(extraStubs);
    }
    return models[name];
  },
  transaction: function (transactionCallback) {
    var trx;
    if (trxs.length) {
      trx = trxs.shift();
    } else {
      trx = {
        // commit: sinon.spy(),
        // rollback: sinon.spy()
      };
    }
    return transactionCallback(trx);
  },
  queueTrxs: function (count) {
    var queued = [];
    for (var i = 0; i < count; ++i) {
      var trx = {
        // commit: sinon.spy(),
        // rollback: sinon.spy()
      };
      queued.push(trx);
    }
    for (var i in queued) {
      trxs.push(queued[i]);
    }
    return queued;
  },
  clearTrxs: function () {
    trxs.length = 0;
  },
  Collection: Collection
};

module.exports = mockBookshelf;
