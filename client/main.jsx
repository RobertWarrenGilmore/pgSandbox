'use strict'
require('babel-polyfill')
const React = require('react')
const ReactDom = require('react-dom')
const {Router, Route, IndexRoute, Redirect} = require('react-router')
const { Provider } = require('react-redux')
const createBrowserHistory = require('history/lib/createBrowserHistory')
const flux = require('./flux')
const authActions = require('./flux/auth/actions')
const App = require('./views/app.jsx')
const InfoPage = require('./views/infoPage/routeHandler.jsx')
const LogIn = require('./views/logInRouteHandler.jsx')
const Register = require('./views/registerRouteHandler.jsx')
const ForgotPassword = require('./views/forgotPasswordRouteHandler.jsx')
const SetPassword = require('./views/setPasswordRouteHandler.jsx')
// const Users = require('./views/users.jsx')
const UserPage = require('./views/users/userPageRouteHandler.jsx')
const BlogPost = require('./views/blog/blogPostRouteHandler.jsx')
const BlogSearch = require('./views/blog/blogSearchRouteHandler.jsx')
const NotFound = require('./views/notFoundRouteHandler.jsx')

function requireAuth(nextState, replaceState) {
  if (!flux.getState().auth.credentials) {
    replaceState({
      nextLocation: nextState.location
    }, '/login')
  }
}

function requireNoAuth(nextState, replaceState) {
  if (flux.getState().auth.credentials) {
    replaceState(null, '/')
  }
}

function logOut(nextState, replaceState) {
  flux.dispatch(authActions.logOut())
}

document.addEventListener('DOMContentLoaded', function() {
  flux.dispatch(authActions.resume()).then(function () {
    const router = (
      <Provider store={flux}>
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
            {/*
                <IndexRoute component={Users}/>
            */}
                <Route component={UserPage} path=':userId'/>
              </Route>
            </Route>

            <Route onEnter={logOut}>
              <Route component={SetPassword} path='users/:userId/setPassword'/>
              <Redirect from='/logOut' to='/'/>
            </Route>

            <Route component={NotFound} path='*'/>

          </Route>
        </Router>
      </Provider>
    )
    const element = document.getElementById('appContainer')
    ReactDom.render(router, element)
  })
})
