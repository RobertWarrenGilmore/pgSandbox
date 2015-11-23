var _ = require('lodash');
var Fluxxor = require('fluxxor');
var ajax = require('../utilities/ajax');

var UsersStore = Fluxxor.createStore({
  actions: {
    'SET_USER_ACTION_STATUS': '_setStatus',
    'SET_USER_QUERY': '_setQuery',
    'CLEAR_READ_USERS': '_clearList',
    'APPEND_READ_USERS': '_appendList',
    'UPDATE_USER': '_updateUser'
  },
  initialize: function (options) {
    this.saving = false;
    this.loading = false;
    this._clearList();
  },
  _setStatus: function (payload, type) {
    this.saving = !!payload.saving;
    this.loading = !!payload.loading;
    this.emit('change');
  },
  _clearList: function (payload, type) {
    this.query = null;
    this.list = [];
    this.map = {};
    this.totalCount = 0;
    this.emit('change');
  },
  _setQuery: function (payload, type) {
    this.query = payload.query;
    this.emit('change');
  },
  _appendList: function (payload, type) {
    this.totalCount = payload.totalCount;
    var list = this.list;
    var map = this.map;
    for (var i in payload.list) {
      var user = payload.list[i];
      var wrappedUser = {
        data: user
      };
      list.push(wrappedUser);
      map[user.id] = wrappedUser;
    }
    this.emit('change');
  },
  _updateUser: function (payload, type) {
    this.map[payload.user.id].data = payload.user;
    this.emit('change');
  },
  isSaving: function () {
    return this.saving;
  },
  isLoading: function () {
    return this.loading;
  },
  getQuery: function () {
    return this.query;
  },
  getTotalCount: function () {
    return this.totalCount;
  },
  getList: function () {
    return _.map(this.list, function (wrappedUser) {
      return wrappedUser.data;
    });
  },
  getUser: function (id) {
    return this.map[id].data;
  }
});

var actions = {
  search: function (query) {
    this.dispatch('SET_USER_ACTION_STATUS', {
      
    });
  },
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
  Store: UsersStore,
  actions: actions
};
