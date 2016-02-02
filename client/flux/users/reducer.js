'use strict'
const Immutable = require('seamless-immutable')
const { handleActions } = require('redux-actions')
const types = require('./types')

const initialState = Immutable({})

const reducer = handleActions({
  [types.CACHE_USERS]: (state = initialState, action) => state.merge(action.payload)
}, initialState)

module.exports = reducer
