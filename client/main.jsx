var React = require('react');
var ReactDom = require('react-dom');
var ReactRouter = require('react-router');
var Router = ReactRouter.Router;
var Route = ReactRouter.Route;
var App = require('./views/app');
var Login = require('./views/login');
var Logout = require('./views/logout');
var Users = require('./views/users');
var User = require('./views/user');

document.addEventListener('DOMContentLoaded', function() {
  ReactDom.render((
      <Router>
        <Route component={App} path='/'>
          <Route component={Login} path='login'/>
          <Route component={Logout} path='logout'/>
          <Route component={Users} path='users'/>
          <Route component={User} path='users/:userId'/>
        </Route>
      </Router>
    ),
    document.getElementById('appContainer')
  );
});
