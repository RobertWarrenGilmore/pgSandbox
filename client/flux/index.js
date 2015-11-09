var Fluxxor = require('fluxxor');
var auth = require('./auth');
var registration = require('./registration');
var passwordReset = require('./passwordReset');

var stores = {
  auth: new auth.Store(),
  registration: new registration.Store(),
  passwordReset: new passwordReset.Store()
};
var actions = {
  auth: auth.actions,
  registration: registration.actions,
  passwordReset: passwordReset.actions
};

var flux = new Fluxxor.Flux(stores, actions);

module.exports = flux;
