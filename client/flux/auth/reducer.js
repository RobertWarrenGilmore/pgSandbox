'use strict'
const Immutable = require('seamless-immutable')
const { handleActions } = require('redux-actions')
const types = require('./types')

const initialState = Immutable({
  busy: false,
  credentials: null,
  id: null
})

const reducer = handleActions({
  [types.SET_AUTH_BUSY]: (state = initialState, action) => state.merge({
    busy: action.payload
  }),
  [types.SET_AUTH_CREDENTIALS]: (state = initialState, action) => state.merge({
    credentials: action.payload.credentials,
    id: action.payload.id
  })
}, initialState)

module.exports = reducer
