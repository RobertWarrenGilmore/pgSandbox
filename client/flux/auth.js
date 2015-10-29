var Fluxxor = require('fluxxor');
var Promise = require('bluebird');
var ajax = require('../utilities/ajax');

var AuthStore = Fluxxor.createStore({
  actions: {
    'SET_AUTH_IN_PROGRESS': '_setInProgress',
    'SET_AUTH': '_setAuth'
  },
  _setInProgress: function (payload, type) {
    this.auth = null;
    this.inProgress = true;
    this.emit('change');
  },
  _setAuth: function (payload, type) {
    this.error = payload.error;
    if (!payload.emailAddress) {
      this.auth = null;
      delete localStorage.auth;
    } else {
      this.auth = {
        emailAddress: payload.emailAddress,
        password: payload.password
      };
      localStorage.auth = JSON.stringify(this.auth);
    }
    this.inProgress = false;
    this.emit('change');
  },
  isInProgress: function () {
    return this.inProgress;
  },
  getAuth: function () {
    return this.auth;
  },
  getError: function () {
    return this.error;
  }
});

var actions = {
  logIn: function (emailAddress, password) {
    this.dispatch('SET_AUTH_IN_PROGRESS');
    var self = this;
    return ajax({
      method: 'GET',
      uri: '/api/auth',
      auth: {
        user: emailAddress,
        pass: password
      }
    }).then(function (response) {
      if (response.statusCode === 200) {
        self.dispatch('SET_AUTH', {
          emailAddress: emailAddress,
          password: password
        });
      } else {
        self.dispatch('SET_AUTH', {
          error: response.body
        });
      }
    }).catch(function (error) {
      self.dispatch('SET_AUTH', {
        error: error.message
      });
    });
  },
  resumeAuth: function () {
    if (localStorage.auth) {
      var auth = JSON.parse(localStorage.auth);
      return this.flux.actions.auth.logIn(auth.emailAddress, auth.password);
    } else {
      return Promise.resolve();
    }
  },
  logOut: function () {
    this.dispatch('SET_AUTH', {});
  }
};

module.exports = {
  Store: AuthStore,
  actions: actions
};
