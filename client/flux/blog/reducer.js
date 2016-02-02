'use strict'
const Immutable = require('seamless-immutable')
const { handleActions } = require('redux-actions')
const types = require('./types')

const initialState = Immutable({
  posts: {}
})

const reducer = handleActions({
  [types.CACHE_POSTS]: (state = initialState, action) => state.merge({
    posts: state.posts.merge(action.payload)
  })
}, initialState)

module.exports = reducer
