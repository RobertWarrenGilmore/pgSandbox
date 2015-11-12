var Fluxxor = require('fluxxor');
var title = require('./title');
var auth = require('./auth');
var registration = require('./registration');
var forgotPassword = require('./forgotPassword');
var passwordSet = require('./passwordSet');

var stores = {
  title: new title.Store(),
  auth: new auth.Store(),
  registration: new registration.Store(),
  forgotPassword: new forgotPassword.Store(),
  passwordSet: new passwordSet.Store()
};
var actions = {
  title: title.actions,
  auth: auth.actions,
  registration: registration.actions,
  forgotPassword: forgotPassword.actions,
  passwordSet: passwordSet.actions
};

var flux = new Fluxxor.Flux(stores, actions);

flux.setDispatchInterceptor(function (action, dispatch) {
  setTimeout(function () {
    dispatch(action);
  });
});

module.exports = flux;
