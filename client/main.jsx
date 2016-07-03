'use strict'
require('babel-polyfill')

if (!window.location.origin)
  window.location.origin = window.location.protocol + '//' + window.location.hostname + (window.location.port ? ':' + window.location.port: '')

const React = require('react')
const ReactDom = require('react-dom')
const { Router, Route, IndexRoute, useRouterHistory } = require('react-router')
const { createHistory } = require('history')
const qs = require('qs')
const { Provider } = require('react-redux')
const flux = require('./flux')
const authActions = require('./flux/auth/actions')
const App = require('./views/app.jsx')
const InfoPage = require('./views/infoPage/routeHandler.jsx')
const LogIn = require('./views/logInRouteHandler.jsx')
const Register = require('./views/registerRouteHandler.jsx')
const ForgotPassword = require('./views/forgotPasswordRouteHandler.jsx')
const SetPassword = require('./views/setPasswordRouteHandler.jsx')
const UserSearch = require('./views/users/search/routeHandler.jsx')
const UserPage = require('./views/users/userPageRouteHandler.jsx')
const BlogPost = require('./views/blog/blogPostRouteHandler.jsx')
const BlogSearch = require('./views/blog/blogSearchRouteHandler.jsx')
const NotFound = require('./views/notFoundRouteHandler.jsx')
const DragTest = require('./views/dragTest.jsx')

document.addEventListener('DOMContentLoaded', () => {
  flux.dispatch(authActions.resume())
    .catch(err => {})
    .then(() => {

      function requireAuth(nextState, replace) {
        if (!flux.getState().auth.credentials)
          return replace({
            state: {
              nextLocation: nextState.location
            },
            pathname: '/logIn'
          })
      }

      function requireNoAuth(nextState, replace) {
        if (flux.getState().auth.credentials)
          return replace('/')
      }

      const history = useRouterHistory(createHistory)({
        parseQueryString: qs.parse,
        stringifyQuery: qs.stringify
      })

      const router = (
        <Provider store={flux}>
          <Router
            history={history}
            >
            <Route
              component={App}
              path='/'
              >

              <IndexRoute component={InfoPage}/>

              <Route component={DragTest} path='dragTest'/>

              <Route path='blog'>
                <IndexRoute component={BlogSearch}/>
                <Route component={BlogPost} path=':postId'/>
              </Route>

              <Route onEnter={requireNoAuth}>
                <Route component={LogIn} path='logIn'/>
                <Route component={Register} path='register'/>
                <Route component={ForgotPassword} path='forgotPassword'/>
                <Route component={SetPassword} path='setPassword'/>
              </Route>

              <Route onEnter={requireAuth}>
                <Route path='users'>
                  <IndexRoute component={UserSearch}/>
                  <Route path=':userId'>
                    <IndexRoute component={UserPage}/>
                  </Route>
                </Route>
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
