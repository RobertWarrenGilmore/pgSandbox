var Fluxxor = require('fluxxor');

var TitleStore = Fluxxor.createStore({
  actions: {
    'SET_TITLE': '_setTitle'
  },
  _setTitle: function (payload, type) {
    this.title = payload.title;
    this.emit('change');
  },
  get: function () {
    return this.title;
  }
});

var actions = {
  set: function (title) {
    this.dispatch('SET_TITLE', {
      title: title
    });
  }
};

module.exports = {
  Store: TitleStore,
  actions: actions
};
