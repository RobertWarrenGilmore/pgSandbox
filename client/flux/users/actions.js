'use strict'
const ajax = require('../../utilities/ajax')
const store = require('../')
const { createAction: createActionCreator } = require('redux-actions')
const types = require('./types')
const authTypes = require('../auth/types')
const handleError = require('../handleError')

const setAuthCredentials = createActionCreator(authTypes.SET_AUTH_CREDENTIALS)
const { setTimeZone } = require('../timeZone/actions')

// private action creators
const cacheUsers = createActionCreator(types.CACHE_USERS)
const updateAvatar = createActionCreator(types.UPDATE_AVATAR)

// public action creators
const creators = {
  create(user) {
    return dispatch => {
      return ajax({
        method: 'POST',
        uri: '/api/users',
        json: true,
        body: user
      })
      .then(({ statusCode, body }) => {
        if (statusCode !== 201) {
          handleError(body)
        }
      })
    }
  },
  save(user, id) {
    return dispatch => {
      const authCredentials = store.getState().auth.credentials
      const authUserId = store.getState().auth.id
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
      })
      .then(({ statusCode, body }) => {
        if (statusCode === 200) {
          if (id) {
            dispatch(cacheUsers({
              [id]: body
            }))
            if (user.avatar !== undefined)
              dispatch(updateAvatar({
                id
              }))
            if (user.timeZone && id == authUserId)
              dispatch(setTimeZone(user.timeZone.toString()))
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
          handleError(body)
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
      })
      .then(({ statusCode, body }) => {
        if (statusCode === 200) {
          dispatch(cacheUsers({
            [id]: body
          }))
        } else if (statusCode === 404) {
          dispatch(cacheUsers({
            [id]: null
          }))
        } else {
          handleError(body)
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
      })
      .then(({ statusCode, body }) => {
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
          handleError(body)
        }
      })
    }
  },
  setPassword({ emailAddress, password, passwordResetKey }) {
    return dispatch => {
      return ajax({
        method: 'PUT',
        uri: '/api/setPassword',
        json: true,
        body: {
          emailAddress,
          password,
          passwordResetKey
        }
      })
      .then(({ statusCode, body }) => {
        if (statusCode !== 200)
          handleError(body)
      })
    }
  },
  resetPassword(emailAddress) {
    return dispatch => {
      return ajax({
        method: 'PUT',
        uri: '/api/setPassword',
        json: true,
        body: {
          emailAddress,
          passwordResetKey: null
        }
      })
      .then(({ statusCode, body }) => {
        if (statusCode !== 200)
          handleError(body)
      })
    }
  }
}

module.exports = creators
