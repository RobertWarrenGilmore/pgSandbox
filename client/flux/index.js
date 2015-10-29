var Fluxxor = require('fluxxor');
var auth = require('./auth');
var registration = require('./registration');

var stores = {
  auth: new auth.Store(),
  registration: new registration.Store()
};
var actions = {
  auth: auth.actions,
  registration: registration.actions
};

var flux = new Fluxxor.Flux(stores, actions);

module.exports = flux;
