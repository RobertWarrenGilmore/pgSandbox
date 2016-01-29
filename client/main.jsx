'use strict';
import 'babel-polyfill';
const React = require('react');
const ReactDom = require('react-dom');
const ReactRouter = require('react-router');
const Router = ReactRouter.Router;
const Route = ReactRouter.Route;
const IndexRoute = ReactRouter.IndexRoute;
const Redirect = ReactRouter.Redirect;
const createBrowserHistory = require('history/lib/createBrowserHistory');
const auth = require('./flux/auth');
const Promise = require('bluebird');
import App from './views/app.jsx';
const InfoPage = require('./views/infoPage.jsx');
const LogIn = require('./views/logIn.jsx');
const Register = require('./views/register.jsx');
const ForgotPassword = require('./views/forgotPassword.jsx');
const SetPassword = require('./views/setPassword.jsx');
const Users = require('./views/users.jsx');
const User = require('./views/user.jsx');
const BlogPost = require('./views/blogPost.jsx');
const BlogSearch = require('./views/blogSearch.jsx');
const NotFound = require('./views/notFound.jsx');

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
    const router = (
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
    const element = document.getElementById('appContainer');
    ReactDom.render(router, element);
  });
});
