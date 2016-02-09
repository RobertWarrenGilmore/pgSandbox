'use strict'
const ajax = require('../../utilities/ajax')
const store = require('../')
const { createAction: createActionCreator } = require('redux-actions')
const types = require('./types')
const authTypes = require('../auth/types')

const setAuthCredentials = createActionCreator(authTypes.SET_AUTH_CREDENTIALS)

// private action creators
const cacheUsers = createActionCreator(types.CACHE_USERS)

// public action creators
const creators = {
  create(user) {
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
  save(user, id) {
    return dispatch => {
      const authCredentials = store.getState().auth.credentials
      if (typeof user.passwordResetKey === 'string') {
        user = {
          password: user.password,
          passwordResetKey: user.passwordResetKey
        }
      } else if (user.passwordResetKey === null) {
        user = {
          emailAddress: user.emailAddress,
          passwordResetKey: null
        }
        id = ''
      }
      return ajax({
        method: 'PUT',
        uri: '/api/users/' + id,
        json: true,
        auth: authCredentials,
        body: user
      }).then(({ statusCode, body }) => {
        if (statusCode === 200) {
          if (id) {
            dispatch(cacheUsers({
              [id]: body
            }))
          }
          if (id == store.getState().auth.id) {
            dispatch(setAuthCredentials({
              credentials: {
                emailAddress: user.emailAddress || authCredentials.emailAddress,
                password: user.password || authCredentials.password
              },
              id: id
            }))
          }
        } else if (statusCode === 404) {
          if (id) {
            dispatch(cacheUsers({
              [id]: null
            }))
          }
        } else {
          throw new Error(body.message || body)
        }
      })
    }
  },
  load(id) {
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
  search(query) {
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
