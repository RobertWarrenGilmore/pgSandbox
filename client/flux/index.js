'use strict'
const Immutable = require('seamless-immutable')
const thunkMiddleware = require('redux-thunk')
const createLogger = require('redux-logger')
const { createStore, applyMiddleware, combineReducers } = require('redux')

// Get the reducers.
const auth = require('./auth/reducer')
const users = require('./users/reducer')
const blog = require('./blog/reducer')

const rootReducer = combineReducers({
  auth,
  users,
  blog
})

const loggerMiddleware = createLogger()

const store = createStore(
  rootReducer,
  Immutable({}),
  applyMiddleware(
    thunkMiddleware, // lets us dispatch() functions
    loggerMiddleware // neat middleware that logs actions
  )
)

module.exports = store
