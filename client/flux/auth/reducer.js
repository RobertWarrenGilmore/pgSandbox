'use strict'
const { handleActions } = require('redux-actions')
const types = require('./types')

const initialState = {
  busy: false,
  credentials: null,
  id: null
}

const reducer = handleActions({
  [types.SET_AUTH_BUSY]: (state = initialState, action) => state.merge({
    busy: action.payload
  }),
  [types.SET_AUTH_CREDENTIALS]: (state = initialState, action) => {
    const newState = state.merge({
      credentials: action.payload.credentials,
      id: action.payload.id
    })
    localStorage.auth = JSON.stringify(newState.credentials)
    return newState
  }
}, initialState)

module.exports = reducer
