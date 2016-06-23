'use strict'
const Immutable = require('seamless-immutable')
const thunkMiddleware = require('redux-thunk')
const { createStore, applyMiddleware, combineReducers, compose } = require('redux')

// Get the reducers.
const auth = require('./auth/reducer')
const timeZone = require('./timeZone/reducer')
const users = require('./users/reducer')
const blog = require('./blog/reducer')
const infoPages = require('./infoPages/reducer')

const rootReducer = combineReducers({
  auth,
  timeZone,
  users,
  blog,
  infoPages
})

const immutableRootReducer = (...args) => Immutable(rootReducer(...args))

const store = createStore(
  immutableRootReducer,
  Immutable({}),
  compose(
    applyMiddleware(
      thunkMiddleware, // lets us dispatch() functions
    ),
    window.devToolsExtension ? window.devToolsExtension() : f => f
  )
)

module.exports = store
