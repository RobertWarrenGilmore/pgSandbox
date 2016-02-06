'use strict'
const ajax = require('../../utilities/ajax')
const store = require('../')
const { createAction: createActionCreator } = require('redux-actions')
const types = require('./types')

// private action creators
const cacheUsers = createActionCreator(types.CACHE_USERS)

// public action creators
const creators = {
  createUser(user) {
    return dispatch => {
      return ajax({
        method: 'POST',
        uri: '/api/users',
        json: true,
        body: user
      }).then(({ statusCode, body }) => {
        if (statusCode !== 201) {
          throw new Error(body.message || body)
        }
      })
    }
  },
  saveUser(user) {
    return dispatch => {
      const authCredentials = store.getState().auth.credentials
      let id = user.id
      if (user.passwordResetKey) {
        user = {
          password: user.password,
          passwordResetKey: user.passwordResetKey
        }
      }
      return ajax({
        method: 'PUT',
        uri: '/api/users/' + id,
        json: true,
        auth: authCredentials,
        body: user
      }).then(({statusCode, body }) => {
        if (statusCode === 200) {
          dispatch(cacheUsers({
            [user.id]: body
          }))
        } else if (statusCode === 404) {
          dispatch(cacheUsers({
            [user.id]: null
          }))
        } else {
          throw new Error(body.message || body)
        }
      })
    }
  },
  loadUser(id) {
    return dispatch => {
      const authCredentials = store.getState().auth.credentials
      return ajax({
        method: 'GET',
        uri: '/api/users/' + id,
        json: true,
        auth: authCredentials
      }).then(({ statusCode, body }) => {
        if (statusCode === 200) {
          dispatch(cacheUsers({
            [id]: body
          }))
        } else if (statusCode === 404) {
          dispatch(cacheUsers({
            [id]: null
          }))
        } else {
          throw new Error(body.message || body)
        }
      })
    }
  },
  searchUsers(query) {
    return dispatch => {
      const authCredentials = store.getState().auth.credentials
      return ajax({
        method: 'GET',
        uri: '/api/users',
        auth: authCredentials,
        json: true,
        qs: query
      }).then(({ statusCode, body }) => {
        if (statusCode === 200) {
          let userMap = {}
          let idList = []
          body.forEach(user => {
            userMap[user.id] = user
            idList.push(user.id)
          })
          dispatch(cacheUsers(userMap))
          return idList
        } else {
          throw new Error(body.message || body)
        }
      })
    }
  }
}

module.exports = creators
