'use strict'
const ajax = require('../../utilities/ajax')
const store = require('../')
const { createAction: createActionCreator } = require('redux-actions')
const types = require('./types')

// private action creators
const setAuthBusy = createActionCreator(types.SET_AUTH_BUSY, (arg) => arg !== false)
const setAuthCredentials = createActionCreator(types.SET_AUTH_CREDENTIALS)
const { load: loadUser } = require('../users/actions')

// public action creators
const creators = {
  resume() {
    return dispatch => {
      if (!store.getState().auth.busy) {
        if (localStorage.auth) {
          const credentials = JSON.parse(localStorage.auth)
          return dispatch(creators.logIn(credentials))
        } else {
          dispatch(setAuthCredentials({
            credentials: null,
            id: null
          }))
          return Promise.resolve()
        }
      }
    }
  },
  logIn(credentials) {
    return dispatch => {
      if (!store.getState().auth.busy) {
        const prevId = store.getState().auth.id
        dispatch(setAuthCredentials({
          credentials: null,
          id: null
        }))
        dispatch(setAuthBusy(true))
        return ajax({
          method: 'GET',
          uri: '/api/auth',
          json: true,
          auth: credentials
        }).then(({ statusCode, body }) => {
          if (statusCode === 200) {
            dispatch(setAuthCredentials({
              credentials,
              id: body.id
            }))
            return body.id
          } else {
            throw new Error(body.message || body)
          }
        })
        // Cache the new user.
        .then(newId => dispatch(loadUser(newId)))
        // Cache the previous user again, to remove attributes that are invisible to the new user.
        .then(() => {
          if (prevId !== null) {
            dispatch(loadUser(prevId))
          }
        })
        .catch(err => {
          dispatch(setAuthCredentials({
            credentials: null,
            id: null
          }))
          throw err
        })
        .finally(() => dispatch(setAuthBusy(false)))
      }
    }
  },
  logOut() {
    return dispatch => {
      if (!store.getState().auth.busy) {
        dispatch(setAuthCredentials({
          credentials: null,
          id: null
        }))
      }
    }
  }
}

module.exports = creators
