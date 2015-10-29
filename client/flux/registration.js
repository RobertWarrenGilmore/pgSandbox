var Fluxxor = require('fluxxor');
var ajax = require('../utilities/ajax');

var RegistrationStore = Fluxxor.createStore({
  actions: {
    'SET_REGISTRATION_IN_PROGRESS': '_setInProgress',
    'SET_REGISTRATION_RESULT': '_setResult'
  },
  initialize: function (options) {
    this.result = {};
  },
  _setInProgress: function (payload, type) {
    this.result = {};
    this.inProgress = true;
    this.emit('change');
  },
  _setResult: function (payload, type) {
    this.result = payload;
    this.inProgress = false;
    this.emit('change');
  },
  isInProgress: function () {
    return this.inProgress;
  },
  getResult: function () {
    return this.result;
  }
});

var actions = {
  register: function (body) {
    this.dispatch('SET_REGISTRATION_IN_PROGRESS');
    var self = this;
    return ajax({
      method: 'POST',
      uri: '/api/users',
      json: true,
      body: body
    }).then(function (response) {
      if (response.statusCode === 201) {
        self.dispatch('SET_REGISTRATION_RESULT', {
          success: true
        });
      } else {
        self.dispatch('SET_REGISTRATION_RESULT', {
          error: response.body
        });
      }
      self.loggingIn = false;
    }).catch(function (error) {
      self.dispatch('SET_REGISTRATION_RESULT', {
        error: error.message
      });
    });
  }
};

module.exports = {
  Store: RegistrationStore,
  actions: actions
};
