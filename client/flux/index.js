var Fluxxor = require('fluxxor');
var auth = require('./auth');
var registration = require('./registration');
var passwordSet = require('./passwordSet');

var stores = {
  auth: new auth.Store(),
  registration: new registration.Store(),
  passwordSet: new passwordSet.Store()
};
var actions = {
  auth: auth.actions,
  registration: registration.actions,
  passwordSet: passwordSet.actions
};

var flux = new Fluxxor.Flux(stores, actions);

module.exports = flux;
