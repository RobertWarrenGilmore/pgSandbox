'use strict'
const { handleActions } = require('redux-actions')
const types = require('./types')

const initialState = {
  posts: {}
}

const reducer = handleActions({
  [types.CACHE_POSTS]: (state = initialState, action) => state.merge({
    posts: state.posts.merge(action.payload)
  })
}, initialState)

module.exports = reducer
