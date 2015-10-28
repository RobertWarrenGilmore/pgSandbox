var Fluxxor = require('fluxxor');
var auth = require('./auth');

var stores = {
  auth: new auth.Store()
};
var actions = {
  auth: auth.actions
};

var flux = new Fluxxor.Flux(stores, actions);

module.exports = flux;
