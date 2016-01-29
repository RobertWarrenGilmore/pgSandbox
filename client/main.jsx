'use strict'
import 'babel-polyfill'
import React from 'react'
import ReactDom from 'react-dom'
import {Router, Route, IndexRoute, Redirect} from 'react-router'
import createBrowserHistory from 'history/lib/createBrowserHistory'
import auth from './flux/auth'
import Promise from 'bluebird'
import App from './views/app.jsx'
import InfoPage from './views/infoPage.jsx'
import LogIn from './views/logIn.jsx'
import Register from './views/register.jsx'
import ForgotPassword from './views/forgotPassword.jsx'
import SetPassword from './views/setPassword.jsx'
import Users from './views/users.jsx'
import User from './views/user.jsx'
import BlogPost from './views/blogPost.jsx'
import BlogSearch from './views/blogSearch.jsx'
import NotFound from './views/notFound.jsx'

Promise.config({
  cancellation: true
})

function requireAuth(nextState, replaceState) {
  if (!auth.getCredentials()) {
    replaceState({
      nextLocation: nextState.location
    }, '/login')
  }
}

function requireNoAuth(nextState, replaceState) {
  if (auth.getCredentials()) {
    replaceState(null, '/')
  }
}

function logOut(nextState, replaceState) {
  auth.logOut()
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
    )
    const element = document.getElementById('appContainer')
    ReactDom.render(router, element)
  })
})
