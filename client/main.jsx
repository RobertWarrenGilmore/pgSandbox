var React = require('react');
var ReactDom = require('react-dom');
var ReactRouter = require('react-router');
var Router = ReactRouter.Router;
var Route = ReactRouter.Route;
var createBrowserHistory = require('history/lib/createBrowserHistory');
var App = require('./views/app.jsx');
var Login = require('./views/login.jsx');
var Logout = require('./views/logout.jsx');
var Users = require('./views/users.jsx');
var User = require('./views/user.jsx');
var NotFound = require('./views/notFound.jsx');

document.addEventListener('DOMContentLoaded', function() {
  ReactDom.render((
      <Router history={createBrowserHistory()}>
        <Route component={App} path='/'>
          <Route component={Login} path='login'/>
          <Route component={Logout} path='logout'/>
          <Route component={Users} path='users'/>
          <Route component={User} path='users/:userId'/>
          <Route component={NotFound} path='*'/>
        </Route>
      </Router>
    ),
    document.getElementById('appContainer')
  );
});
