'use strict'
const { handleActions } = require('redux-actions')
const types = require('./types')

const initialState = {
  posts: {},
  authorIds: []
}

const reducer = handleActions({
  [types.CACHE_POSTS]: (state = initialState, action) => state.merge({
    posts: state.posts.merge(action.payload)
  }),
  [types.SET_AUTHOR_IDS]: (state = initialState, action) => state.merge({
    authorIds: action.payload
  })
}, initialState)

module.exports = reducer
