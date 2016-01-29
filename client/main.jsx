'use strict';
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
var InfoPage = require('./views/infoPage.jsx');
var LogIn = require('./views/logIn.jsx');
var Register = require('./views/register.jsx');
var ForgotPassword = require('./views/forgotPassword.jsx');
var SetPassword = require('./views/setPassword.jsx');
var Users = require('./views/users.jsx');
var User = require('./views/user.jsx');
var BlogPost = require('./views/blogPost.jsx');
var BlogSearch = require('./views/blogSearch.jsx');
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

document.addEventListener('DOMContentLoaded', function() {
  auth.resume().then(function () {
    var router = (
      <Router history={createBrowserHistory()}>
        <Route component={App} path='/'>

          <IndexRoute component={InfoPage}/>

          <Route path='blog'>
            <IndexRoute component={BlogSearch}/>
            <Route component={BlogPost} path=':postId'/>
          </Route>

          <Route onEnter={requireNoAuth}>
            <Route component={LogIn} path='logIn'/>
            <Route component={Register} path='register'/>
            <Route component={ForgotPassword} path='forgotPassword'/>
          </Route>

          <Route onEnter={requireAuth}>
            <Route path='users'>
              <IndexRoute component={Users}/>
              <Route component={User} path=':userId'/>
            </Route>
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
});
