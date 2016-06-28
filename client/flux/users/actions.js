'use strict'
const ajax = require('../../utilities/ajax')
const store = require('../')
const { createAction: createActionCreator } = require('redux-actions')
const types = require('./types')
const authTypes = require('../auth/types')
const NoSuchResourceError = require('../../../errors/noSuchResourceError')

const setAuthCredentials = createActionCreator(authTypes.SET_AUTH_CREDENTIALS)
const { setTimeZone } = require('../timeZone/actions')

// private action creators
const cacheUsers = createActionCreator(types.CACHE_USERS)
const updateAvatar = createActionCreator(types.UPDATE_AVATAR)

// public action creators
const creators = {
  create(user) {
    return dispatch =>
      ajax({
        method: 'POST',
        uri: '/api/users',
        json: true,
        body: user
      })
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
      .then(response => {
        if (id) {
          dispatch(cacheUsers({
            [id]: response
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
            id
          }))
        }
      })
      .catch(err => {
        if (err instanceof NoSuchResourceError)
          dispatch(cacheUsers({
            [id]: null
          }))
        else
          throw err
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
      .then(response => {
        dispatch(cacheUsers({
          [id]: response
        }))
      })
      .catch(err => {
        if (err instanceof NoSuchResourceError)
          dispatch(cacheUsers({
            [id]: null
          }))
        else
          throw err
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
      .then(response => {
        const userMap = {}
        const idList = []
        response.forEach(user => {
          userMap[user.id] = user
          idList.push(user.id)
        })
        dispatch(cacheUsers(userMap))
        return idList
      })
    }
  },
  setPassword({ emailAddress, password, passwordResetKey }) {
    return dispatch =>
      ajax({
        method: 'POST',
        uri: '/api/setPassword',
        json: true,
        body: {
          emailAddress,
          password,
          passwordResetKey
        }
      })

  },
  resetPassword(emailAddress) {
    return dispatch =>
      ajax({
        method: 'PUT',
        uri: '/api/setPassword',
        json: true,
        body: {
          emailAddress,
          passwordResetKey: null
        }
      })
  }
}

module.exports = creators
