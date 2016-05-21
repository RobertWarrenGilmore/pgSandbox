'use strict'
const { handleActions } = require('redux-actions')
const types = require('./types')

const initialState = {
  cache: {},
  avatarUpdatedTimes: {}
}

const reducer = handleActions({
  [types.UPDATE_AVATAR]: (state = initialState, action) => {
    const {
      id
    } = action.payload
    return state.merge({
      avatarUpdatedTimes: state.avatarUpdatedTimes.merge({
        [id]: new Date().getTime()
      })
    })
  },
  [types.CACHE_USERS]: (state = initialState, action) => state.merge({
    cache: state.cache.merge(action.payload)
  })
}, initialState)

module.exports = reducer
