var React = require('react');
var ReactDom = require('react-dom');
var ReactRouter = require('react-router');
var Router = ReactRouter.Router;
var Route = ReactRouter.Route;
var IndexRoute = ReactRouter.IndexRoute;
var Redirect = ReactRouter.Redirect;
var createBrowserHistory = require('history/lib/createBrowserHistory');
var auth = require('./flux/auth');
var Promise = require('bluebird');
var App = require('./views/app.jsx');
var Home = require('./views/home.jsx');
var LogIn = require('./views/logIn.jsx');
var Register = require('./views/register.jsx');
var ForgotPassword = require('./views/forgotPassword.jsx');
var SetPassword = require('./views/setPassword.jsx');
var Users = require('./views/users.jsx');
var User = require('./views/user.jsx');
var NotFound = require('./views/notFound.jsx');

Promise.config({
  cancellation: true
});

function requireAuth(nextState, replaceState) {
  if (!auth.getCredentials()) {
    replaceState({
      nextLocation: nextState.location
    }, '/login');
  }
}

function requireNoAuth(nextState, replaceState) {
  if (auth.getCredentials()) {
    replaceState(null, '/');
  }
}

function logOut(nextState, replaceState) {
  auth.logOut();
}

auth.resume();
document.addEventListener('DOMContentLoaded', function() {
  var router = (
    <Router history={createBrowserHistory()}>
      <Route component={App} path='/'>

        <IndexRoute component={Home}/>

        <Route onEnter={requireNoAuth}>
          <Route component={LogIn} path='logIn'/>
          <Route component={Register} path='register'/>
          <Route component={ForgotPassword} path='forgotPassword'/>
        </Route>

        <Route onEnter={requireAuth}>
          <Route component={Users} path='users'/>
          <Route component={User} path='users/:userId'/>
        </Route>

        <Route onEnter={logOut}>
          <Route component={SetPassword} path='users/:userId/setPassword'/>
          <Redirect from='/logOut' to='/'/>
        </Route>

        <Route component={NotFound} path='*'/>

      </Route>
    </Router>
  );
  var element = document.getElementById('appContainer');
  ReactDom.render(router, element);
});
