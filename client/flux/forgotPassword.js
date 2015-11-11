var Fluxxor = require('fluxxor');
var ajax = require('../utilities/ajax');

var ForgotPasswordStore = Fluxxor.createStore({
  actions: {
    'SET_FORGOT_PASSWORD_IN_PROGRESS': '_setInProgress',
    'SET_FORGOT_PASSWORD_RESULT': '_setResult'
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
  sendEmail: function (params) {
    this.dispatch('SET_FORGOT_PASSWORD_IN_PROGRESS');
    var self = this;
    return ajax({
      method: 'PUT',
      uri: '/api/users/' + params.userId,
      json: true,
      body: {
        emailAddress: params.emailAddress,
        passwordResetKey: true
      }
    }).then(function (response) {
      if (response.statusCode === 200) {
        self.dispatch('SET_FORGOT_PASSWORD_RESULT', {
          success: true
        });
      } else {
        self.dispatch('SET_FORGOT_PASSWORD_RESULT', {
          error: response.body
        });
      }
      self.loggingIn = false;
    }).catch(function (error) {
      self.dispatch('SET_FORGOT_PASSWORD_RESULT', {
        error: error.message
      });
    });
  }
};

module.exports = {
  Store: ForgotPasswordStore,
  actions: actions
};
