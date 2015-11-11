var Fluxxor = require('fluxxor');
var auth = require('./auth');
var registration = require('./registration');
var forgotPassword = require('./forgotPassword');
var passwordSet = require('./passwordSet');

var stores = {
  auth: new auth.Store(),
  registration: new registration.Store(),
  forgotPassword: new forgotPassword.Store(),
  passwordSet: new passwordSet.Store()
};
var actions = {
  auth: auth.actions,
  registration: registration.actions,
  forgotPassword: forgotPassword.actions,
  passwordSet: passwordSet.actions
};

var flux = new Fluxxor.Flux(stores, actions);

module.exports = flux;
