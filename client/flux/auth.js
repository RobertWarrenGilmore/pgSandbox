var Fluxxor = require('fluxxor');
var ajax = require('../utilities/ajax');

var AuthStore = Fluxxor.createStore({
  actions: {
    'SET_AUTH_IN_PROGRESS': '_setAuthInProgress',
    'SET_AUTH': '_setAuth'
  },
  _setAuthInProgress: function (payload, type) {
    this.auth = null;
    this.authInProgress = true;
  },
  _setAuth: function (payload, type) {
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
    this.authInProgress = false;
  },
  isAuthInProgress: function () {
    return this.authInProgress;
  },
  getAuth: function () {
    return this.auth;
  }
});

var actions = {
  logIn: function (emailAddress, password) {
    this.dispatch('SET_AUTH_IN_PROGRESS');
    var self = this;
    ajax({
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
        self.dispatch('SET_AUTH', {});
      }
      self.loggingIn = false;
    }).catch(function (error) {
      self.dispatch('SET_AUTH', {});
      throw error;
    });
  },
  resumeAuth: function () {
    if (localStorage.auth) {
      var auth = JSON.parse(localStorage.auth);
      this.flux.actions.auth.logIn(auth.emailAddress, auth.password);
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
