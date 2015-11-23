var React = require('react');
var ReactDom = require('react-dom');
var ReactRouter = require('react-router');
var Router = ReactRouter.Router;
var Route = ReactRouter.Route;
var Redirect = ReactRouter.Redirect;
var createBrowserHistory = require('history/lib/createBrowserHistory');
var auth = require('./flux/auth');
var App = require('./views/app.jsx');
var LogIn = require('./views/logIn.jsx');
var Register = require('./views/register.jsx');
var ForgotPassword = require('./views/forgotPassword.jsx');
var SetPassword = require('./views/setPassword.jsx');
var Users = require('./views/users.jsx');
var User = require('./views/user.jsx');
var NotFound = require('./views/notFound.jsx');

function requireAuth(nextState, replaceState) {
  if (!auth.getCredentials()) {
    replaceState({
      nextPathname: nextState.location.pathname
    }, '/login');
  }
}

function denyAuth(nextState, replaceState) {
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

        <Route onEnter={denyAuth}>
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
