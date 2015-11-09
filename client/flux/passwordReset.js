var Fluxxor = require('fluxxor');
var ajax = require('../utilities/ajax');

var PasswordResetStore = Fluxxor.createStore({
  actions: {
    'SET_PASSWORD_RESET_IN_PROGRESS': '_setInProgress',
    'SET_PASSWORD_RESET_RESULT': '_setResult'
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
  set: function (params) {
    this.dispatch('SET_PASSWORD_RESET_IN_PROGRESS');
    var self = this;
    if (params.password !== params.verifyPassword) {
      self.dispatch('SET_PASSWORD_RESET_RESULT', {
        error: 'The passwords must match.'
      });
    } else {
      return ajax({
        method: 'PUT',
        uri: '/api/users/' + params.userId,
        json: true,
        body: {
          password: params.password,
          passwordResetKey: params.passwordResetKey
        }
      }).then(function (response) {
        if (response.statusCode === 200) {
          self.dispatch('SET_PASSWORD_RESET_RESULT', {
            success: true
          });
        } else {
          self.dispatch('SET_PASSWORD_RESET_RESULT', {
            error: response.body
          });
        }
        self.loggingIn = false;
      }).catch(function (error) {
        self.dispatch('SET_PASSWORD_RESET_RESULT', {
          error: error.message
        });
      });
    }
  }
};

module.exports = {
  Store: PasswordResetStore,
  actions: actions
};
