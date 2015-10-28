var React = require('react');
var ReactDom = require('react-dom');
var ReactRouter = require('react-router');
var Router = ReactRouter.Router;
var Route = ReactRouter.Route;
var createBrowserHistory = require('history/lib/createBrowserHistory');
var flux = require('./flux');
var App = require('./views/app.jsx');
var Login = require('./views/login.jsx');
var Users = require('./views/users.jsx');
var User = require('./views/user.jsx');
var NotFound = require('./views/notFound.jsx');

function requireAuth(nextState, replaceState) {
  if (!flux.store('auth').getAuth()) {
    replaceState({
      nextPathname: nextState.location.pathname //TODO This has something to do with this: https://github.com/rackt/react-router/blob/master/examples/auth-with-shared-root/components/Login.js#L15
    }, '/login');
  }
}

function denyAuth(nextState, replaceState) {
  if (flux.store('auth').getAuth()) {
    replaceState(null, '/');
  }
}

function logOut(nextState, replaceState) {
  flux.actions
    .auth
    .logOut();
  replaceState(null, '/');
}

document
  .addEventListener('DOMContentLoaded', function() {
    function addFlux(Component, props) {
      return <Component {...props} flux={flux}/>;
    }
    var router = (
      <Router createElement={addFlux} history={createBrowserHistory()}>
        {/* TODO Does this flux declaration work with the mixin? */}
        <Route component={App} path='/'>

          <Route onEnter={denyAuth}>
            <Route component={Login} path='login'/>
            <Route path='register'/>
            {/* TODO Add the registration component. */}
          </Route>
          <Route onEnter={logOut} path='logout'/>

          <Route onEnter={requireAuth}>
            <Route component={Users} path='users'/>
            <Route component={User} path='users/:userId'/>
          </Route>

          <Route component={NotFound} path='*'/>
        </Route>
      </Router>
    );
    var element = document.getElementById('appContainer');
    ReactDom.render(router, element);
  });
