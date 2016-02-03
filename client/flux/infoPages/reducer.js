'use strict'
const Immutable = require('seamless-immutable')
const { handleActions } = require('redux-actions')
const types = require('./types')

const initialState = Immutable({
  pages: {}
})

const reducer = handleActions({
  [types.CACHE_PAGES]: (state = initialState, action) => state.merge({
    pages: state.pages.merge(action.payload)
  })
}, initialState)

module.exports = reducer
